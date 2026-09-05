"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Badge from "@/components/Badge";
import { ATTENDANCE_RADIUS_KM } from "@/lib/constants";

interface Presence {
  name: string;
  place: string;
  km: string;
  time: string;
  coord: string;
  status: string;
  lat: number;
  lng: number;
}

interface Locations {
  hq: { lat: number; lng: number; label: string };
  presence: Presence[];
}

const lat0 = -5.4,
  lat1 = -8.6,
  lng0 = 105.0,
  lng1 = 114.5;
const pinX = (lng: number) => 6 + ((lng - lng0) / (lng1 - lng0)) * 88;
const pinY = (lat: number) => 8 + ((lat - lat0) / (lat1 - lat0)) * 80;

export default function LokasiPage() {
  const [data, setData] = useState<Locations | null>(null);

  useEffect(() => {
    fetch("/api/admin/locations")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Lokasi & Absensi"
        subtitle={`Posisi terakhir setiap karyawan terhadap radius ${ATTENDANCE_RADIUS_KM} km dari kantor pusat`}
      />

      <div className="grid gap-4 pt-5.5" style={{ gridTemplateColumns: "minmax(0,1fr) 330px" }}>
        <div className="p-5 bg-ar-surface border border-ar-line rounded-2xl">
          <div className="flex justify-between gap-3 items-center mb-3.5">
            <span className="text-[10.5px] tracking-[0.18em] uppercase text-ar-dim">
              Sebaran lokasi absensi · radius {ATTENDANCE_RADIUS_KM} km
            </span>
            <span className="text-[10.5px] text-ar-faint">skema, bukan peta jalan</span>
          </div>
          <div className="relative h-[392px] rounded-2xl border border-ar-line bg-ar-surface2 overflow-hidden">
            <span className="absolute rounded-full border border-dashed border-ar-goldline" style={{ left: "50%", top: "50%", width: 340, height: 340, margin: "-170px 0 0 -170px" }} />
            <span className="absolute rounded-full bg-ar-goldfill" style={{ left: "50%", top: "50%", width: 340, height: 340, margin: "-170px 0 0 -170px" }} />
            <span className="absolute rounded-full border border-ar-line" style={{ left: "50%", top: "50%", width: 170, height: 170, margin: "-85px 0 0 -85px" }} />

            {data && (
              <span
                className="absolute flex flex-col-reverse items-center gap-1.5"
                style={{ left: `${pinX(data.hq.lng)}%`, top: `${pinY(data.hq.lat)}%`, transform: "translate(-50%,-50%)" }}
              >
                <span className="w-4 h-4 rounded-full grid place-items-center text-[8px] font-bold" style={{ background: "var(--ar-gold2)", color: "#0B1A13" }} />
                <span className="text-[9.5px] tracking-[0.06em] whitespace-nowrap py-0.5 px-1.5 rounded-md bg-ar-surface border border-ar-line text-ar-gold2">
                  {data.hq.label}
                </span>
              </span>
            )}
            {data?.presence.map((p, i) => {
              const ok = p.status === "Dalam radius";
              return (
                <span
                  key={i}
                  className="absolute flex flex-col items-center gap-1.5"
                  style={{ left: `${pinX(p.lng)}%`, top: `${pinY(p.lat)}%`, transform: "translate(-50%,-50%)" }}
                >
                  <span
                    className="w-[11px] h-[11px] rounded-full"
                    style={{ background: ok ? "var(--ar-green)" : "var(--ar-red)" }}
                  />
                  <span className="text-[9.5px] tracking-[0.06em] whitespace-nowrap py-0.5 px-1.5 rounded-md bg-ar-surface border border-ar-line text-ar-dim">
                    {p.name.split(" ")[0]} · {p.km}
                  </span>
                </span>
              );
            })}

            <span className="absolute left-3.5 bottom-3 text-[10px] tracking-[0.14em] uppercase text-ar-dim">
              ◎ {data?.hq.label ?? "Kantor Pusat"} · lingkaran = batas {ATTENDANCE_RADIUS_KM} km
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {data?.presence.map((p, i) => (
            <div key={i} className="p-3.5 bg-ar-surface border border-ar-line rounded-[13px]">
              <div className="flex justify-between gap-2.5 items-center">
                <span className="text-[13px]">{p.name}</span>
                <Badge status={p.status} />
              </div>
              <div className="text-[11px] text-ar-dim mt-1.5 leading-[1.6]">
                {p.place} · {p.km}
                <br />
                Login {p.time} · {p.coord}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
