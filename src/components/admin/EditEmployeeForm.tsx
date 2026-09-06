"use client";

import { useState } from "react";
import EmployeeFields, { type EmployeeFieldsValue, type SupervisorOption } from "./EmployeeFields";

export interface EditableEmployee {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  level: "SILVER" | "PLATINUM";
  role: string;
  place: string;
  supervisorId: string;
}

export default function EditEmployeeForm({
  employee,
  supervisors,
  onSaved,
  onCancel,
}: {
  employee: EditableEmployee;
  supervisors: SupervisorOption[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<EmployeeFieldsValue>({
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    level: employee.level,
    role: employee.role,
    place: employee.place,
    supervisorId: employee.supervisorId,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...value, supervisorId: value.supervisorId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Gagal menyimpan perubahan.");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4.5 bg-ar-surface2 border border-ar-goldline rounded-2xl my-1" style={{ gridColumn: "1 / -1" }}>
      <div className="flex justify-between items-center mb-3.5">
        <span className="font-display text-[17px] text-ar-gold2">
          Edit {employee.name} ({employee.code})
        </span>
        <button onClick={onCancel} className="text-ar-dim text-[11px] cursor-pointer">
          Batal
        </button>
      </div>

      <EmployeeFields
        value={value}
        onChange={(patch) => setValue((v) => ({ ...v, ...patch }))}
        supervisors={supervisors}
        excludeSupervisorId={employee.id}
      />

      <div className="min-h-[18px] text-[11px] mt-3 text-ar-red">{msg}</div>
      <button
        disabled={busy}
        onClick={submit}
        className="mt-1 py-2.5 px-5 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60"
      >
        Simpan Perubahan
      </button>
    </div>
  );
}
