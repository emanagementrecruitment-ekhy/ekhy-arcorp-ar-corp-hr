"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Badge from "@/components/Badge";
import EditEmployeeForm from "@/components/admin/EditEmployeeForm";
import { ATTENDANCE_RADIUS_KM, usesVcr, type EmployeeLevel } from "@/lib/constants";
import { fmtRp, relativeTimeLabel } from "@/lib/format";
import type { MapPresence } from "@/components/admin/LocationsMap";
import { cardClass } from "@/components/ui/styles";

const LocationsMap = dynamic(() => import("@/components/admin/LocationsMap"), { ssr: false });

interface Presence extends MapPresence {
  email: string;
  phone: string;
  level: EmployeeLevel | null;
  customRate: number | null;
  salary: number | null;
  role: string;
  supervisorId: string;
  channelLink: string;
  birthPlace: string | null;
  birthDate: string | null;
  code: string;
  time: string;
  coord: string;
}

interface Locations {
  restricted: boolean;
  hq: { lat: number; lng: number; label: string };
  radiusKm: number;
  presence: Presence[];
}

interface SupervisorOption {
  id: string;
  name: string;
  code: string;
}

export default function LokasiPage() {
  const [data, setData] = useState<Locations | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<{ id: string; n: number } | null>(null);

  function load() {
    fetch("/api/admin/locations")
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(() => {
    load();
    // Keeps pins/status current without a manual refresh — matches the
    // header's own online-count/clock ticker cadence elsewhere in admin.
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        const role = d.session?.accessRole;
        setCanEdit(["OWNER", "CONSULTANT", "MANAGER"].includes(role));
        if (role !== "SUPERVISOR") {
          fetch("/api/admin/employees?pageSize=500")
            .then((r) => r.json())
            .then((dd) =>
              setSupervisors(
                (dd.employees ?? [])
                  .filter((e: { role: string }) => e.role === "Kepala Mess")
                  .map((e: { id: string; name: string; code: string }) => ({ id: e.id, name: e.name, code: e.code }))
              )
            );
        }
      });
  }, []);

  const editing = data?.presence.find((p) => p.id === editingId) ?? null;
  const restricted = data?.restricted ?? false;

  return (
    <div>
      <AdminPageHeader
        title="Lokasi & Absensi"
        subtitle={
          restricted
            ? "Absensi karyawan — peta lokasi & koordinat GPS tidak ditampilkan untuk peran ini"
            : `Posisi terakhir setiap karyawan terhadap radius ${ATTENDANCE_RADIUS_KM.toLocaleString("id-ID")} km dari kantor pusat`
        }
      />

      <div
        className={`grid grid-cols-1 gap-4 pt-5.5 ${restricted ? "" : "lg:[grid-template-columns:minmax(0,1fr)_330px]"}`}
      >
        {!restricted && (
          <div className={cardClass}>
            <div className="flex justify-between gap-3 items-center mb-1.5">
              <span className="text-[10.5px] tracking-[0.18em] uppercase text-ar-dim">
                Sebaran lokasi absensi · radius {ATTENDANCE_RADIUS_KM.toLocaleString("id-ID")} km
              </span>
              {canEdit && <span className="text-[10.5px] text-ar-faint">Klik pin karyawan untuk mengubah datanya</span>}
            </div>
            <div className="text-[10.5px] text-ar-faint mb-2.5 leading-[1.6]">
              Posisi dikirim aplikasi karyawan/Tera kira-kira tiap menit selama aplikasinya terbuka (saat aplikasi
              ditutup atau layar mati, titik tetap di posisi terakhir). Daftar diperbarui otomatis tiap 20 detik; klik
              nama di daftar untuk terbang ke titiknya.
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 text-[10.5px] text-ar-dim">
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-[#7FD1A8] inline-block" />GPS langsung, dalam radius</span>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-[#E2716B] inline-block" />Luar radius</span>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-[#8A93A3] inline-block" />Lokasi terdaftar (belum ada GPS)</span>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-[#D6AE5F] inline-block" />Kantor pusat</span>
            </div>

            {data && (
              <LocationsMap
                hq={data.hq}
                radiusKm={data.radiusKm}
                presence={data.presence}
                canEdit={canEdit}
                onSelect={(id) => setEditingId(id)}
                focusId={focusId}
              />
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {data?.presence.map((p) => (
            <div key={p.id} className="p-3.5 bg-ar-surface border border-ar-line rounded-[13px]">
              <div className="flex justify-between gap-2.5 items-center">
                {restricted ? (
                  <span className="text-[13px]">{p.name}</span>
                ) : (
                  <button
                    onClick={() => setFocusId({ id: p.id, n: Date.now() })}
                    className="text-[13px] text-left cursor-pointer hover:text-ar-gold2"
                    title="Lihat di peta"
                  >
                    {p.name}
                  </button>
                )}
                <Badge status={p.status} />
              </div>
              <div className="text-[11px] text-ar-dim mt-1.5 leading-[1.6]">
                {p.place} · {p.km}
                <br />
                Login {p.time} · {relativeTimeLabel(p.lastSeenAt)}
                {!restricted && ` · ${p.coord}`}
                {p.isFallbackLocation && (
                  <>
                    <br />
                    <span className="text-amber-500">⚠ Lokasi terdaftar — belum ada GPS langsung</span>
                  </>
                )}
                {!usesVcr(p.role) && (
                  <>
                    <br />
                    Gaji: <span className="text-ar-gold2">{fmtRp(p.salary ?? 0)}</span>
                  </>
                )}
              </div>
              {canEdit && (
                <button onClick={() => setEditingId(p.id)} className="mt-2 text-[10.5px] text-ar-gold cursor-pointer">
                  Edit
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60"
          onClick={(e) => e.target === e.currentTarget && setEditingId(null)}
        >
          <div className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto bg-ar-bg rounded-2xl">
            <EditEmployeeForm
              employee={{
                id: editing.id,
                code: editing.code,
                name: editing.name,
                email: editing.email,
                phone: editing.phone,
                level: editing.level,
                customRate: editing.customRate,
                salary: editing.salary,
                role: editing.role,
                place: editing.place,
                supervisorId: editing.supervisorId,
                channelLink: editing.channelLink,
                birthPlace: editing.birthPlace,
                birthDate: editing.birthDate,
              }}
              supervisors={supervisors}
              onSaved={() => {
                setEditingId(null);
                load();
              }}
              onCancel={() => setEditingId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
