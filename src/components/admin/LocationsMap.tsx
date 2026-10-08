"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function dotIcon(color: string, size: number, live: boolean, ring = false) {
  const cls = live ? "arc-map-dot arc-map-dot-live" : "arc-map-dot";
  const border = ring ? "3px solid #fff3cf" : "2px solid rgba(7,8,11,.85)";
  return L.divIcon({
    className: "",
    html: `<span class="${cls}" style="--dot:${color};width:${size}px;height:${size}px;background:${color};border:${border}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
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
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: true, zoomControl: true }).setView([hq.lat, hq.lng], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    const markers = markersRef.current;
    return () => {
      map.remove();
      mapRef.current = null;
      markers.clear();
      fittedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    markersRef.current.clear();

    const radius = L.circle([hq.lat, hq.lng], {
      radius: radiusKm * 1000,
      color: COLOR_HQ,
      weight: 1.5,
      dashArray: "6 6",
      fillColor: COLOR_HQ,
      fillOpacity: 0.05,
    }).addTo(layer);

    L.marker([hq.lat, hq.lng], { icon: dotIcon(COLOR_HQ, 20, false, true), zIndexOffset: 500 })
      .addTo(layer)
      .bindTooltip("Kantor pusat", { permanent: true, direction: "bottom", offset: [0, 8], className: "arc-map-label" })
      .bindPopup(`<strong>${esc(hq.label)}</strong><br/>Radius absensi ${radiusKm.toLocaleString("id-ID")} km`);

    const showNames = presence.length <= 8;
    for (const p of presence) {
      const live = !p.isFallbackLocation && !!p.lastSeenAt && Date.now() - new Date(p.lastSeenAt).getTime() < LIVE_WINDOW_MS;
      const ok = p.status === "Dalam radius";
      // Grey = not a live GPS reading (no check-in yet, or GPS was denied and the
      // registered outlet address was used instead).
      const color = p.isFallbackLocation ? COLOR_REGISTERED : ok ? COLOR_LIVE : COLOR_OUT;
      const marker = L.marker([p.lat, p.lng], { icon: dotIcon(color, 18, live) }).addTo(layer);
      if (showNames) {
        marker.bindTooltip(esc(p.name), { permanent: true, direction: "top", offset: [0, -10], className: "arc-map-label" });
      } else {
        marker.bindTooltip(esc(p.name), { direction: "top", offset: [0, -10], className: "arc-map-label" });
      }
      const freshness = relativeTimeLabel(p.lastSeenAt);
      const popupHtml = `<strong>${esc(p.name)}</strong><br/>${esc(p.place)} · ${esc(p.km)}<br/>${esc(p.status)} · ${esc(freshness)}${
        live ? `<br/><span style="color:#15803d">● GPS langsung</span>` : ""
      }${
        p.isFallbackLocation
          ? `<br/><span style="color:#b45309">⚠ Lokasi terdaftar — belum ada GPS langsung</span>`
          : ""
      }${canEdit ? `<br/><button data-edit-id="${esc(p.id)}" style="margin-top:6px;cursor:pointer">Edit karyawan</button>` : ""}`;
      marker.bindPopup(popupHtml);
      if (canEdit) {
        marker.on("popupopen", () => {
          const btn = document.querySelector(`[data-edit-id="${p.id}"]`);
          btn?.addEventListener("click", () => onSelect(p.id), { once: true });
        });
      }
      markersRef.current.set(p.id, marker);
    }

    // Frame everything once: the 1.000 km radius is far wider than the default
    // zoom, so fit the circle plus every pin. Later refreshes keep the user's view.
    if (!fittedRef.current) {
      const bounds = radius.getBounds();
      for (const p of presence) bounds.extend([p.lat, p.lng]);
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 9 });
      fittedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hq, radiusKm, presence, canEdit]);

  useEffect(() => {
    if (!focusId) return;
    const map = mapRef.current;
    const marker = markersRef.current.get(focusId.id);
    if (!map || !marker) return;
    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 12), { duration: 0.8 });
    marker.openPopup();
  }, [focusId]);

  return <div ref={containerRef} className="arc-map h-[460px] rounded-2xl border border-ar-line overflow-hidden" />;
}
