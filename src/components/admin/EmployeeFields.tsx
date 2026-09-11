"use client";

import { FIELD_CITIES, FIELD_ROLES, VOUCHER_AMOUNT, VOUCHER_LABEL, type EmployeeLevel } from "@/lib/constants";

export interface SupervisorOption {
  id: string;
  name: string;
  code: string;
}

export interface EmployeeFieldsValue {
  name: string;
  email: string;
  phone: string;
  level: EmployeeLevel;
  role: string;
  place: string;
  supervisorId: string;
  channelLink: string;
}

const inputCls = "w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]";
const labelCls = "text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block";

export function emptyEmployeeFields(): EmployeeFieldsValue {
  return {
    name: "",
    email: "",
    phone: "",
    level: "SILVER",
    role: FIELD_ROLES[0],
    place: FIELD_CITIES[0].place,
    supervisorId: "",
    channelLink: "",
  };
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
          {/* A legacy value from before the Peran list changed won't match any preset —
              show it anyway so the dropdown never silently displays something other than
              what's actually stored (and about to be resubmitted unless changed). */}
          {value.role && !(FIELD_ROLES as readonly string[]).includes(value.role) && (
            <option value={value.role}>{value.role} (lama)</option>
          )}
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
        <label className={labelCls}>Pendapatan / VCR</label>
        <select
          value={value.level}
          onChange={(e) => onChange({ level: e.target.value as EmployeeLevel })}
          className={inputCls}
        >
          {(Object.keys(VOUCHER_AMOUNT) as EmployeeLevel[]).map((lvl) => (
            <option key={lvl} value={lvl}>
              {VOUCHER_LABEL[lvl]} (Rp {VOUCHER_AMOUNT[lvl].toLocaleString("id-ID")}/voucher)
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Lokasi Kerja</label>
        <select value={value.place} onChange={(e) => onChange({ place: e.target.value })} className={inputCls}>
          {value.place && !FIELD_CITIES.some((c) => c.place === value.place) && (
            <option value={value.place}>{value.place} (lama)</option>
          )}
          {FIELD_CITIES.map((c) => (
            <option key={c.place} value={c.place}>
              {c.place}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Channel/Link</label>
        <input
          value={value.channelLink}
          onChange={(e) => onChange({ channelLink: e.target.value })}
          placeholder="cth. wa.me/62812xxxxxxx"
          className={inputCls}
        />
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
