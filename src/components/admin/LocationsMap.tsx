"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { relativeTimeLabel } from "@/lib/format";

export interface MapPresence {
  id: string;
  name: string;
  place: string;
  km: string;
  status: string;
  lat: number;
  lng: number;
  lastSeenAt: string | null;
  isFallbackLocation: boolean;
}

// A GPS reading newer than this is drawn as "live" (pulsing).
const LIVE_WINDOW_MS = 15 * 60 * 1000;

const COLOR_LIVE = "#7FD1A8";
const COLOR_OUT = "#E2716B";
const COLOR_REGISTERED = "#8A93A3";
const COLOR_HQ = "#D6AE5F";

// OpenFreeMap: free hosted vector tiles, no API key. Dark style for night mode.
const STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";
const STYLE_LIGHT = "https://tiles.openfreemap.org/styles/positron";

const RADIUS_SRC = "arc-radius";

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function isDarkMode() {
  return document.documentElement.getAttribute("data-mode") !== "light";
}

/** Polygon approximating a circle of radiusKm around a point (geodesic, 128 steps). */
function circleGeoJSON(lat: number, lng: number, radiusKm: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const steps = 128;
  const R = 6371;
  const d = radiusKm / R;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const brng = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng));
    const lng2 = lng1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    ring.push([(((lng2 * 180) / Math.PI + 540) % 360) - 180, (lat2 * 180) / Math.PI]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

function dotEl(color: string, size: number, live: boolean, ring: boolean, label: string | null) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;cursor:pointer";
  if (label) {
    const tag = document.createElement("span");
    tag.className = "arc-map-label";
    tag.textContent = label;
    wrap.appendChild(tag);
  }
  const dot = document.createElement("span");
  dot.className = live ? "arc-map-dot arc-map-dot-live" : "arc-map-dot";
  dot.style.cssText = `--dot:${color};width:${size}px;height:${size}px;background:${color};border:${
    ring ? "3px solid #fff3cf" : "2px solid rgba(7,8,11,.85)"
  }`;
  wrap.appendChild(dot);
  return wrap;
}

export default function LocationsMap({
  hq,
  radiusKm,
  presence,
  canEdit,
  onSelect,
  focusId,
}: {
  hq: { lat: number; lng: number; label: string };
  radiusKm: number;
  presence: MapPresence[];
  canEdit: boolean;
  onSelect: (id: string) => void;
  /** Set to fly the map to that person's pin and open it. */
  focusId?: { id: string; n: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const overlaysRef = useRef<maplibregl.Marker[]>([]);
  const fittedRef = useRef(false);
  const styleDarkRef = useRef<boolean | null>(null);
  const radiusRef = useRef({ hq, radiusKm });

  // Draw the radius circle (re-added after every style change).
  const drawRadius = () => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const { hq: h, radiusKm: r } = radiusRef.current;
    const data = circleGeoJSON(h.lat, h.lng, r);
    const src = map.getSource(RADIUS_SRC) as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(data);
      return;
    }
    map.addSource(RADIUS_SRC, { type: "geojson", data });
    map.addLayer({ id: `${RADIUS_SRC}-fill`, type: "fill", source: RADIUS_SRC, paint: { "fill-color": COLOR_HQ, "fill-opacity": 0.06 } });
    map.addLayer({
      id: `${RADIUS_SRC}-line`,
      type: "line",
      source: RADIUS_SRC,
      paint: { "line-color": COLOR_HQ, "line-width": 1.5, "line-dasharray": [3, 3] },
    });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const dark = isDarkMode();
    styleDarkRef.current = dark;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: dark ? STYLE_DARK : STYLE_LIGHT,
      center: [hq.lng, hq.lat],
      zoom: 5,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("style.load", drawRadius);
    mapRef.current = map;
    const markers = markersRef.current;

    // Follow the day/night switch of the app.
    const observer = new MutationObserver(() => {
      const nowDark = isDarkMode();
      if (nowDark !== styleDarkRef.current) {
        styleDarkRef.current = nowDark;
        map.setStyle(nowDark ? STYLE_DARK : STYLE_LIGHT);
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markers.clear();
      overlaysRef.current = [];
      fittedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const m of markersRef.current.values()) m.remove();
    for (const m of overlaysRef.current) m.remove();
    markersRef.current.clear();
    overlaysRef.current = [];

    radiusRef.current = { hq, radiusKm };
    drawRadius();

    const hqPopup = new maplibregl.Popup({ offset: 14 }).setHTML(
      `<strong>${esc(hq.label)}</strong><br/>Radius absensi ${radiusKm.toLocaleString("id-ID")} km`,
    );
    overlaysRef.current.push(
      new maplibregl.Marker({ element: dotEl(COLOR_HQ, 20, false, true, "Kantor pusat") })
        .setLngLat([hq.lng, hq.lat])
        .setPopup(hqPopup)
        .addTo(map),
    );

    const showNames = presence.length <= 8;
    for (const p of presence) {
      const live = !p.isFallbackLocation && !!p.lastSeenAt && Date.now() - new Date(p.lastSeenAt).getTime() < LIVE_WINDOW_MS;
      const ok = p.status === "Dalam radius";
      // Grey = not a live GPS reading (no check-in yet, or GPS was denied and the
      // registered outlet address was used instead).
      const color = p.isFallbackLocation ? COLOR_REGISTERED : ok ? COLOR_LIVE : COLOR_OUT;
      const freshness = relativeTimeLabel(p.lastSeenAt);
      const html = `<strong>${esc(p.name)}</strong><br/>${esc(p.place)} · ${esc(p.km)}<br/>${esc(p.status)} · ${esc(freshness)}${
        live ? `<br/><span style="color:#15803d">● GPS langsung</span>` : ""
      }${
        p.isFallbackLocation ? `<br/><span style="color:#b45309">⚠ Lokasi terdaftar — belum ada GPS langsung</span>` : ""
      }${canEdit ? `<br/><button data-edit-id="${esc(p.id)}" style="margin-top:6px;cursor:pointer">Edit karyawan</button>` : ""}`;
      const popup = new maplibregl.Popup({ offset: 12 }).setHTML(html);
      if (canEdit) {
        popup.on("open", () => {
          const btn = popup.getElement()?.querySelector(`[data-edit-id="${p.id}"]`);
          btn?.addEventListener("click", () => onSelect(p.id), { once: true });
        });
      }
      const marker = new maplibregl.Marker({ element: dotEl(color, 18, live, false, showNames ? p.name : null) })
        .setLngLat([p.lng, p.lat])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.set(p.id, marker);
    }

    // Frame everything once: the 1.000 km radius is far wider than the default
    // zoom, so fit the circle plus every pin. Later refreshes keep the user's view.
    if (!fittedRef.current) {
      const bounds = new maplibregl.LngLatBounds();
      for (const [lng, lat] of circleGeoJSON(hq.lat, hq.lng, radiusKm).geometry.coordinates[0]) bounds.extend([lng, lat]);
      for (const p of presence) bounds.extend([p.lng, p.lat]);
      map.fitBounds(bounds, { padding: 24, maxZoom: 9, duration: 0 });
      fittedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hq, radiusKm, presence, canEdit]);

  useEffect(() => {
    if (!focusId) return;
    const map = mapRef.current;
    const marker = markersRef.current.get(focusId.id);
    if (!map || !marker) return;
    map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), 12), duration: 800 });
    if (!marker.getPopup()?.isOpen()) marker.togglePopup();
  }, [focusId]);

  return <div ref={containerRef} className="arc-map h-[460px] rounded-2xl border border-ar-line overflow-hidden" />;
}
