"use client";

import { useState } from "react";

// A tiny walk-through of one working month. Nothing here touches real data.
const STEPS = [
  { t: "Absen masuk", d: "Anda tiba di lokasi dan menekan tombol absen. Jam dan lokasi tercatat.", v: "Hadir +1 hari" },
  { t: "Mencatat voucher (VCR)", d: "Setiap layanan selesai, voucher komisi dicatat. Contoh: 12 voucher hari ini.", v: "VCR +12" },
  { t: "Mengajukan kasbon", d: "Butuh uang di tengah bulan? Ajukan kasbon. Owner menyetujui, nominal masuk potongan.", v: "Kasbon Rp 200.000 (contoh)" },
  { t: "Akhir bulan", d: "Sistem menghitung hari hadir, total VCR, dan potongan kasbon secara otomatis.", v: "Slip Pay dihitung" },
  { t: "Unduh Slip Pay", d: "Slip Pay siap di menu Payslip. Unduh PDF-nya atau minta kantor mengirimkannya.", v: "Selesai ✓" },
] as const;

export default function ProjectSimulation() {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  return (
    <div className="p-4 bg-ar-surface border border-ar-goldline rounded-2xl">
      <div className="flex gap-1.5 mb-3" aria-hidden>
        {STEPS.map((_, k) => (
          <span key={k} className={`h-1 flex-1 rounded-full ${k <= i ? "bg-ar-gold" : "bg-ar-line"}`} />
        ))}
      </div>
      <div className="text-[10px] tracking-[0.2em] uppercase text-ar-dim">
        Langkah {i + 1} dari {STEPS.length}
      </div>
      <div className="font-display text-[16px] text-ar-gold2 mt-1">{s.t}</div>
      <p className="text-[12.5px] leading-[1.7] text-ar-dim mt-1.5">{s.d}</p>
      <div className="mt-3 inline-block py-1 px-3 rounded-full bg-ar-goldfill text-ar-text text-[11.5px]">{s.v}</div>
      <div className="mt-4 flex gap-2.5">
        <button
          disabled={i === 0}
          onClick={() => setI(i - 1)}
          className="py-2 px-4 rounded-[10px] border border-ar-line text-[11.5px] text-ar-dim disabled:opacity-40 cursor-pointer"
        >
          Sebelumnya
        </button>
        {i < STEPS.length - 1 ? (
          <button onClick={() => setI(i + 1)} className="py-2 px-4 rounded-[10px] bg-ar-gold text-ar-ongold text-[11.5px] font-semibold cursor-pointer">
            Lanjut
          </button>
        ) : (
          <button onClick={() => setI(0)} className="py-2 px-4 rounded-[10px] border border-ar-goldline text-ar-gold text-[11.5px] cursor-pointer">
            Ulangi simulasi
          </button>
        )}
      </div>
    </div>
  );
}
