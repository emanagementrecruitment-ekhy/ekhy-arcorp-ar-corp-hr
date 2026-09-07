"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPresence {
  id: string;
  name: string;
  place: string;
  km: string;
  status: string;
  lat: number;
  lng: number;
}

function dotIcon(color: string, size: number) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:999px;background:${color};border:2px solid rgba(11,26,19,.6);box-shadow:0 0 0 2px rgba(255,255,255,.15)"></span>`,
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
}: {
  hq: { lat: number; lng: number; label: string };
  radiusKm: number;
  presence: MapPresence[];
  canEdit: boolean;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([hq.lat, hq.lng], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    L.circle([hq.lat, hq.lng], {
      radius: radiusKm * 1000,
      color: "#C9A24B",
      weight: 1,
      dashArray: "4 4",
      fillColor: "#C9A24B",
      fillOpacity: 0.06,
    }).addTo(layer);

    L.marker([hq.lat, hq.lng], { icon: dotIcon("#C9A24B", 16) })
      .addTo(layer)
      .bindPopup(hq.label);

    for (const p of presence) {
      const ok = p.status === "Dalam radius";
      const marker = L.marker([p.lat, p.lng], { icon: dotIcon(ok ? "#7FD1A8" : "#E2716B", 13) }).addTo(layer);
      const popupHtml = `<strong>${p.name}</strong><br/>${p.place} · ${p.km}<br/>${p.status}${
        canEdit ? `<br/><button data-edit-id="${p.id}" style="margin-top:6px;cursor:pointer">Edit karyawan</button>` : ""
      }`;
      marker.bindPopup(popupHtml);
      if (canEdit) {
        marker.on("popupopen", () => {
          const btn = document.querySelector(`[data-edit-id="${p.id}"]`);
          btn?.addEventListener("click", () => onSelect(p.id), { once: true });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hq, radiusKm, presence, canEdit]);

  return <div ref={containerRef} className="h-[420px] rounded-2xl border border-ar-line overflow-hidden" />;
}
