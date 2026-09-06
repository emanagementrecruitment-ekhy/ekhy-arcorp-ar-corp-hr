"use client";

import { useState } from "react";
import EmployeeFields, { emptyEmployeeFields, type EmployeeFieldsValue, type SupervisorOption } from "./EmployeeFields";

export default function AddEmployeeForm({
  supervisors,
  onCreated,
}: {
  supervisors: SupervisorOption[];
  onCreated: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<EmployeeFieldsValue>(emptyEmployeeFields());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState("");

  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...value, supervisorId: value.supervisorId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Gagal menambahkan karyawan.");
        return;
      }
      const savedName = value.name;
      onCreated(data.code);
      setValue(emptyEmployeeFields());
      setSuccess(`✓ ${savedName} (${data.code}) berhasil ditambahkan.`);
      setTimeout(() => {
        setSuccess("");
        setOpen(false);
      }, 2000);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="py-2.5 px-4 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer"
      >
        + Tambah Karyawan
      </button>
    );
  }

  if (success) {
    return (
      <div className="p-4.5 bg-[rgba(127,209,168,.1)] border border-[rgba(127,209,168,.3)] rounded-2xl mb-3.5 flex justify-between items-center">
        <span className="text-ar-green text-[12.5px]">{success}</span>
        <button
          onClick={() => {
            setSuccess("");
            setOpen(false);
          }}
          className="text-ar-dim text-[11px] cursor-pointer"
        >
          Tutup
        </button>
      </div>
    );
  }

  return (
    <div className="p-4.5 bg-ar-surface border border-ar-goldline rounded-2xl mb-3.5">
      <div className="flex justify-between items-center mb-3.5">
        <span className="font-display text-[19px] text-ar-gold2">Tambah Karyawan Baru</span>
        <button
          onClick={() => {
            setOpen(false);
            setValue(emptyEmployeeFields());
          }}
          className="text-ar-dim text-[11px] cursor-pointer"
        >
          Batal
        </button>
      </div>

      <EmployeeFields value={value} onChange={(patch) => setValue((v) => ({ ...v, ...patch }))} supervisors={supervisors} />

      <div className="min-h-[18px] text-[11px] mt-3 text-ar-red">{msg}</div>
      <button
        disabled={busy}
        onClick={submit}
        className="mt-1 py-2.5 px-5 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60"
      >
        Simpan Karyawan
      </button>
    </div>
  );
}
