"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Badge from "@/components/Badge";
import EditEmployeeForm from "@/components/admin/EditEmployeeForm";
import { ATTENDANCE_RADIUS_KM, type EmployeeLevel } from "@/lib/constants";
import type { MapPresence } from "@/components/admin/LocationsMap";

const LocationsMap = dynamic(() => import("@/components/admin/LocationsMap"), { ssr: false });

interface Presence extends MapPresence {
  email: string;
  phone: string;
  level: EmployeeLevel;
  role: string;
  supervisorId: string;
  channelLink: string;
  supervisorNote: string;
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

  function load() {
    fetch("/api/admin/locations")
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(() => {
    load();
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        const role = d.session?.accessRole;
        setCanEdit(["OWNER", "CONSULTANT"].includes(role));
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
            : `Posisi terakhir setiap karyawan terhadap radius ${ATTENDANCE_RADIUS_KM} km dari kantor pusat`
        }
      />

      <div
        className={`grid grid-cols-1 gap-4 pt-5.5 ${restricted ? "" : "lg:[grid-template-columns:minmax(0,1fr)_330px]"}`}
      >
        {!restricted && (
          <div className="p-5 bg-ar-surface border border-ar-line rounded-2xl">
            <div className="flex justify-between gap-3 items-center mb-3.5">
              <span className="text-[10.5px] tracking-[0.18em] uppercase text-ar-dim">
                Sebaran lokasi absensi · radius {ATTENDANCE_RADIUS_KM} km
              </span>
              {canEdit && <span className="text-[10.5px] text-ar-faint">Klik pin karyawan untuk mengubah datanya</span>}
            </div>

            {data && (
              <LocationsMap
                hq={data.hq}
                radiusKm={data.radiusKm}
                presence={data.presence}
                canEdit={canEdit}
                onSelect={(id) => setEditingId(id)}
              />
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {data?.presence.map((p) => (
            <div key={p.id} className="p-3.5 bg-ar-surface border border-ar-line rounded-[13px]">
              <div className="flex justify-between gap-2.5 items-center">
                <span className="text-[13px]">{p.name}</span>
                <Badge status={p.status} />
              </div>
              <div className="text-[11px] text-ar-dim mt-1.5 leading-[1.6]">
                {p.place} · {p.km}
                <br />
                Login {p.time}
                {!restricted && ` · ${p.coord}`}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={(e) => e.target === e.currentTarget && setEditingId(null)}
        >
          <div className="w-full max-w-[520px]">
            <EditEmployeeForm
              employee={{
                id: editing.id,
                code: editing.code,
                name: editing.name,
                email: editing.email,
                phone: editing.phone,
                level: editing.level,
                role: editing.role,
                place: editing.place,
                supervisorId: editing.supervisorId,
                channelLink: editing.channelLink,
                supervisorNote: editing.supervisorNote,
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
