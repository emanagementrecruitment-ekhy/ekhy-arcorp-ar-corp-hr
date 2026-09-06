"use client";

import { FIELD_CITIES, FIELD_ROLES } from "@/lib/constants";

export interface SupervisorOption {
  id: string;
  name: string;
  code: string;
}

export interface EmployeeFieldsValue {
  name: string;
  email: string;
  phone: string;
  level: "SILVER" | "PLATINUM";
  role: string;
  place: string;
  supervisorId: string;
}

const inputCls = "w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]";
const labelCls = "text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block";

export function emptyEmployeeFields(): EmployeeFieldsValue {
  return { name: "", email: "", phone: "", level: "SILVER", role: FIELD_ROLES[0], place: FIELD_CITIES[0].place, supervisorId: "" };
}

/** Shared field grid for both the add-employee and edit-employee forms. */
export default function EmployeeFields({
  value,
  onChange,
  supervisors,
  excludeSupervisorId,
}: {
  value: EmployeeFieldsValue;
  onChange: (patch: Partial<EmployeeFieldsValue>) => void;
  supervisors: SupervisorOption[];
  excludeSupervisorId?: string;
}) {
  const supervisorOptions = supervisors.filter((s) => s.id !== excludeSupervisorId);

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <div>
        <label className={labelCls}>Nama Lengkap</label>
        <input
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="cth. Rangga Saputra"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Peran</label>
        <select value={value.role} onChange={(e) => onChange({ role: e.target.value })} className={inputCls}>
          {FIELD_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Email</label>
        <input
          value={value.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="nama@arcorp.id"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Nomor HP</label>
        <input
          value={value.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="0812 xxxx xxxx"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Level</label>
        <select
          value={value.level}
          onChange={(e) => onChange({ level: e.target.value as "SILVER" | "PLATINUM" })}
          className={inputCls}
        >
          <option value="SILVER">Silver (Rp 150.000/voucher)</option>
          <option value="PLATINUM">Platinum / Jasmine (Rp 400.000/voucher)</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Kota / Lokasi Kerja</label>
        <select value={value.place} onChange={(e) => onChange({ place: e.target.value })} className={inputCls}>
          {FIELD_CITIES.map((c) => (
            <option key={c.place} value={c.place}>
              {c.place}
            </option>
          ))}
        </select>
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label className={labelCls}>Supervisor (opsional)</label>
        <select value={value.supervisorId} onChange={(e) => onChange({ supervisorId: e.target.value })} className={inputCls}>
          <option value="">Tidak ada</option>
          {supervisorOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
