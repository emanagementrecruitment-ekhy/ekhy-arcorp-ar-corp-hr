"use client";

import { useState } from "react";
import { FIELD_CITIES, FIELD_ROLES } from "@/lib/constants";

interface SupervisorOption {
  id: string;
  name: string;
  code: string;
}

export default function AddEmployeeForm({
  supervisors,
  onCreated,
}: {
  supervisors: SupervisorOption[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState<"SILVER" | "PLATINUM">("SILVER");
  const [role, setRole] = useState<string>(FIELD_ROLES[0]);
  const [place, setPlace] = useState<string>(FIELD_CITIES[0].place);
  const [supervisorId, setSupervisorId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function reset() {
    setName("");
    setEmail("");
    setPhone("");
    setLevel("SILVER");
    setRole(FIELD_ROLES[0]);
    setPlace(FIELD_CITIES[0].place);
    setSupervisorId("");
    setMsg("");
  }

  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          level,
          role,
          place,
          supervisorId: supervisorId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Gagal menambahkan karyawan.");
        return;
      }
      reset();
      setOpen(false);
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]";
  const labelCls = "text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block";

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

  return (
    <div className="p-4.5 bg-ar-surface border border-ar-goldline rounded-2xl mb-3.5">
      <div className="flex justify-between items-center mb-3.5">
        <span className="font-display text-[19px] text-ar-gold2">Tambah Karyawan Baru</span>
        <button
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-ar-dim text-[11px] cursor-pointer"
        >
          Batal
        </button>
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <label className={labelCls}>Nama Lengkap</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="cth. Rangga Saputra" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Peran</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputCls}>
            {FIELD_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@arcorp.id" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Nomor HP</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812 xxxx xxxx" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Level</label>
          <select value={level} onChange={(e) => setLevel(e.target.value as "SILVER" | "PLATINUM")} className={inputCls}>
            <option value="SILVER">Silver (Rp 150.000/voucher)</option>
            <option value="PLATINUM">Platinum / Jasmine (Rp 400.000/voucher)</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Kota / Lokasi Kerja</label>
          <select value={place} onChange={(e) => setPlace(e.target.value)} className={inputCls}>
            {FIELD_CITIES.map((c) => (
              <option key={c.place} value={c.place}>
                {c.place}
              </option>
            ))}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className={labelCls}>Supervisor (opsional)</label>
          <select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)} className={inputCls}>
            <option value="">Tidak ada</option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
      </div>

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
