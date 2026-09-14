"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/Badge";

interface KasbonRow {
  id: string;
  amountLabel: string;
  reason: string;
  status: string;
  note: string | null;
  dateLabel: string;
}

const PRESETS = [
  { label: "500rb", value: 500_000 },
  { label: "1 jt", value: 1_000_000 },
  { label: "2 jt", value: 2_000_000 },
];

export default function KasbonPage() {
  const [rows, setRows] = useState<KasbonRow[]>([]);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/kasbon")
      .then((r) => r.json())
      .then((d) => setRows(d.kasbon ?? []));
  }

  useEffect(load, []);

  const numericAmount = Number(amount.replace(/[^0-9]/g, "")) || 0;

  async function submit() {
    if (numericAmount <= 0) {
      setMsg("Masukkan nominal kasbon.");
      return;
    }
    if (!reason.trim()) {
      setMsg("Alasan pengajuan wajib diisi.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/kasbon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Gagal mengajukan kasbon.");
        return;
      }
      setAmount("");
      setReason("");
      setMsg("Pengajuan terkirim ke Owner.");
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="font-display text-[26px] pt-3 pb-1.5">Pengajuan Kasbon</div>
      <div className="text-[11.5px] leading-[1.65] text-ar-dim mb-4">
        Persetujuan hanya oleh Owner AR Corp. Kasbon dipotong dari pencairan voucher berikutnya.
      </div>

      <div className="bg-ar-surface border border-ar-line rounded-2xl p-[17px]">
        <div className="text-[10px] tracking-[0.16em] uppercase text-ar-dim mb-2.5">Nominal</div>
        <div className="flex gap-1.5 mb-2.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setAmount(String(p.value))}
              className="flex-1 py-2.5 bg-ar-surface2 border border-ar-line rounded-lg text-ar-dim text-[11.5px] cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          value={amount ? Number(amount).toLocaleString("id-ID") : ""}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="Rp 0"
          className="w-full py-[13px] px-3.5 bg-ar-input border border-ar-goldline rounded-[11px] text-ar-gold2 text-[18px] font-display"
        />
        <div className="text-[10px] tracking-[0.16em] uppercase text-ar-dim mt-4 mb-2.5">Alasan</div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Contoh: biaya transport klien Bandung"
          className="w-full min-h-[76px] resize-y py-[13px] px-3.5 bg-ar-input border border-ar-goldline rounded-[11px] text-ar-text text-[13px] leading-[1.6]"
        />
        <div className="min-h-[18px] text-[11px] mt-1.5 text-ar-gold">{msg}</div>
        <button
          disabled={busy}
          onClick={submit}
          className="w-full py-3.5 ar-grad rounded-[11px] text-ar-ongold text-[11.5px] font-bold tracking-[0.16em] uppercase cursor-pointer disabled:opacity-60"
        >
          Ajukan ke Owner
        </button>
      </div>

      <div className="text-[10px] tracking-[0.18em] uppercase text-ar-dim mt-5 mb-2.5">Riwayat pengajuan</div>
      <div className="flex flex-col gap-2.5">
        {rows.length === 0 && <div className="text-[12px] text-ar-faint py-3">Belum ada pengajuan kasbon.</div>}
        {rows.map((k) => (
          <div key={k.id} className="p-[13px] bg-ar-surface2 border border-ar-line rounded-xl">
            <div className="flex justify-between gap-2.5 items-center">
              <span className="font-display text-[19px] text-ar-gold2">{k.amountLabel}</span>
              <Badge status={k.status} />
            </div>
            <div className="text-[11.5px] text-ar-dim mt-1.5 leading-[1.55]">{k.reason}</div>
            <div className="text-[10.5px] text-ar-faint mt-1.5">
              {k.dateLabel} · {k.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
