"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

interface Candidate {
  id: string;
  name: string;
  code: string;
}

interface Seat {
  peran: string;
  accessRole: string;
  label: string;
  holder: { id: string; name: string; code: string; email: string } | null;
  candidates: Candidate[];
}

export default function JabatanPage() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [picked, setPicked] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function load() {
    fetch("/api/admin/jabatan")
      .then((r) => r.json())
      .then((d) => setSeats(d.seats ?? []));
  }

  useEffect(load, []);

  async function appoint(peran: string) {
    if (!picked) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/jabatan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peran, employeeId: picked }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Gagal mengangkat jabatan.");
        return;
      }
      setPickerFor(null);
      setPicked("");
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Jabatan Kantor"
        subtitle="Tentukan siapa yang menjabat Admin dan Kepala Mess — hanya Owner & Consultant yang bisa mengubah ini"
      />

      <div className="grid gap-4 pt-5.5" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {seats.map((seat) => (
          <div key={seat.peran} className="p-5 bg-ar-surface border border-ar-line rounded-2xl">
            <div className="text-[10.5px] tracking-[0.18em] uppercase text-ar-dim mb-2">{seat.label}</div>
            {seat.holder ? (
              <div className="mb-3.5">
                <div className="font-display text-[19px] text-ar-gold2">{seat.holder.name}</div>
                <div className="text-[11px] text-ar-dim mt-1">
                  {seat.holder.code} · {seat.holder.email}
                </div>
              </div>
            ) : (
              <div className="mb-3.5 text-[12.5px] text-ar-faint">Belum ada yang menjabat.</div>
            )}

            {pickerFor === seat.peran ? (
              <div>
                <select
                  value={picked}
                  onChange={(e) => setPicked(e.target.value)}
                  className="w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px] mb-2.5"
                >
                  <option value="">Pilih karyawan…</option>
                  {seat.candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                {seat.candidates.length === 0 && (
                  <div className="text-[11px] text-ar-faint mb-2.5">
                    Belum ada karyawan dengan Peran &quot;{seat.peran}&quot;. Set dulu Peran-nya di Data Karyawan.
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    disabled={busy || !picked}
                    onClick={() => appoint(seat.peran)}
                    className="py-2.5 px-4 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60"
                  >
                    Angkat
                  </button>
                  <button
                    onClick={() => {
                      setPickerFor(null);
                      setPicked("");
                      setMsg("");
                    }}
                    className="py-2.5 px-4 bg-ar-surface2 border border-ar-line rounded-[10px] text-ar-dim text-[11px] cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setPickerFor(seat.peran)}
                className="py-2 px-3.5 bg-ar-surface2 border border-ar-line rounded-[9px] text-ar-gold text-[11px] cursor-pointer"
              >
                {seat.holder ? "Ganti" : "Angkat"}
              </button>
            )}
          </div>
        ))}
      </div>

      {msg && <div className="mt-3.5 text-[11.5px] text-ar-red">{msg}</div>}

      <div className="mt-3.5 py-4 px-4.5 bg-ar-surface2 border border-ar-line rounded-2xl text-[11.5px] leading-[1.75] text-ar-dim">
        Karyawan yang diangkat akan langsung punya akses login sesuai jabatannya. Yang digantikan otomatis kembali
        jadi karyawan biasa (kehilangan akses kantor).
      </div>
    </div>
  );
}
