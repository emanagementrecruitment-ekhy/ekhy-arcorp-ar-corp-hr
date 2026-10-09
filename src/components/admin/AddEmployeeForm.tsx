"use client";

import { useState } from "react";
import EmployeeFields, { emptyEmployeeFields, type EmployeeFieldsValue, type SupervisorOption } from "./EmployeeFields";
import { btnPrimaryClass } from "@/components/ui/styles";

/** Add panel for one kind of person: "staff" (code AR-xx) or "tera" (code EQ-xx). Open/close is controlled by the page's header button. */
export default function AddEmployeeForm({
  kind,
  open,
  onClose,
  supervisors,
  onCreated,
}: {
  kind: "staff" | "tera";
  open: boolean;
  onClose: () => void;
  supervisors: SupervisorOption[];
  onCreated: (code: string) => void;
}) {
  const noun = kind === "tera" ? "Terapis" : "Staff";
  const setOpen = (v: boolean) => {
    if (!v) onClose();
  };
  const [value, setValue] = useState<EmployeeFieldsValue>(emptyEmployeeFields(kind));
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
        setMsg(data.error ?? `Gagal menambahkan ${noun.toLowerCase()}.`);
        return;
      }
      const savedName = value.name;
      onCreated(data.code);
      setValue(emptyEmployeeFields(kind));
      setSuccess(`✓ ${savedName} (${data.code}) berhasil ditambahkan.`);
      setTimeout(() => {
        setSuccess("");
        setOpen(false);
      }, 2000);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

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
        <span className="font-display text-[19px] text-ar-gold2">Tambah {noun} Baru</span>
        <button
          onClick={() => {
            setOpen(false);
            setValue(emptyEmployeeFields(kind));
          }}
          className="text-ar-dim text-[11px] cursor-pointer"
        >
          Batal
        </button>
      </div>

      <EmployeeFields roleKind={kind} value={value} onChange={(patch) => setValue((v) => ({ ...v, ...patch }))} supervisors={supervisors} />

      <div className="min-h-[18px] text-[11px] mt-3 text-ar-red">{msg}</div>
      <button
        disabled={busy}
        onClick={submit}
        className={`${btnPrimaryClass} mt-1 py-2.5 px-5`}
      >
        Simpan {noun}
      </button>
    </div>
  );
}
