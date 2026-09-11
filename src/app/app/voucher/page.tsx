"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/Badge";

type Period = "harian" | "mingguan" | "bulanan";

interface VoucherRow {
  id: string;
  client: string;
  dateLabel: string;
  time: string;
  code: string;
  amountLabel: string;
  category: string;
  status: string;
}

interface VoucherData {
  periodLabel: string;
  periodRange: string;
  vouchers: VoucherRow[];
  periodTotal: string;
  periodCount: number;
  myLevelLabel: string;
  myRate: number;
  myPlace: string;
  places: string[];
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "harian", label: "Harian" },
  { key: "mingguan", label: "Mingguan" },
  { key: "bulanan", label: "Bulanan" },
];

function fmtRp(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export default function VoucherPage() {
  const [period, setPeriod] = useState<Period>("harian");
  const [data, setData] = useState<VoucherData | null>(null);
  const [place, setPlace] = useState("");
  const [qty, setQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState("");

  function load() {
    fetch(`/api/vouchers?period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setPlace((prev) => prev || d.myPlace || "");
      });
  }

  useEffect(load, [period]);

  const qtyNum = Number(qty) || 0;
  const total = (data?.myRate ?? 0) * qtyNum;

  async function submit() {
    if (!place || qtyNum <= 0) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client: place, qty: qtyNum }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(d.error ?? "Gagal menyimpan.");
        return;
      }
      setSuccess(`✓ ${d.count} voucher tersimpan · ${fmtRp(d.total)}`);
      setQty("1");
      load();
      setTimeout(() => setSuccess(""), 2500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="font-display text-[26px] py-3 pb-3.5">Voucher Komisi</div>
      <div className="grid grid-cols-3 gap-1.5 p-[5px] bg-ar-surface2 rounded-[11px] mb-3.5">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`py-[11px] rounded-[9px] text-[11px] font-semibold tracking-[0.14em] uppercase cursor-pointer ${
              period === p.key ? "bg-ar-goldfill text-ar-gold2 shadow-[inset_0_0_0_1px_var(--ar-goldline)]" : "text-ar-dim"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="bg-ar-goldfill border border-ar-goldline rounded-2xl p-4 mb-4">
        <div className="text-[10px] tracking-[0.18em] uppercase text-ar-dim">
          Pendapatan {data?.periodLabel ?? "…"}
        </div>
        <div className="font-display text-[32px] text-ar-gold2 mt-1">{data?.periodTotal ?? "Rp 0"}</div>
        <div className="text-[11.5px] text-ar-dim mt-1">
          {data?.periodCount ?? 0} voucher · {data?.periodRange ?? ""}
        </div>
      </div>

      <div className="bg-ar-surface border border-ar-line rounded-2xl p-4 mb-4">
        <div className="text-[13px] font-display text-ar-gold2 mb-1">Input Pendapatan Hari Ini</div>
        <div className="text-[10.5px] text-ar-dim mb-3">
          Rate kamu: <span className="text-ar-gold">{data?.myLevelLabel ?? "…"}</span> · {fmtRp(data?.myRate ?? 0)}/VCR
          (ditetapkan dari pusat)
        </div>

        <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Lokasi Kerja</label>
        <select
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          className="w-full py-2.5 px-3.5 mb-3 bg-ar-input border border-ar-goldline rounded-[11px] text-ar-text text-[12.5px]"
        >
          <option value="">Pilih lokasi…</option>
          {(data?.places ?? []).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <label className="text-[10px] tracking-[0.14em] uppercase text-ar-dim mb-1.5 block">Jumlah VCR</label>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-full py-2.5 px-3.5 mb-3 bg-ar-input border border-ar-goldline rounded-[11px] text-ar-text text-[12.5px]"
        />

        <div className="py-2.5 px-3.5 mb-3 bg-ar-surface2 border border-ar-line rounded-[10px] text-[12px] text-ar-gold2">
          {fmtRp(data?.myRate ?? 0)} × {qtyNum} = <strong>{fmtRp(total)}</strong>
        </div>

        {success && <div className="mb-2.5 text-[12px] text-ar-green">{success}</div>}
        {msg && <div className="mb-2.5 text-[11.5px] text-ar-red">{msg}</div>}

        <button
          disabled={busy || !place || qtyNum <= 0}
          onClick={submit}
          className="w-full py-3 ar-grad rounded-[11px] text-ar-ongold text-[11px] font-bold tracking-[0.16em] uppercase cursor-pointer disabled:opacity-60"
        >
          {busy ? "Menyimpan…" : "Simpan Pendapatan"}
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {data?.vouchers.length === 0 && (
          <div className="text-[12px] text-ar-faint py-3">Tidak ada voucher pada periode ini.</div>
        )}
        {data?.vouchers.map((v) => (
          <div key={v.id} className="p-[13px] bg-ar-surface border border-ar-line rounded-[13px]">
            <div className="flex justify-between gap-2.5 items-start">
              <span className="flex-1 min-w-0">
                <span className="block text-[13px]">{v.client}</span>
                <span className="block text-[10.5px] text-ar-dim mt-1">
                  {v.dateLabel} · {v.time} · {v.code}
                </span>
              </span>
              <span className="font-display text-[19px] text-ar-gold2 whitespace-nowrap">{v.amountLabel}</span>
            </div>
            <div className="flex gap-1.5 mt-2.5">
              <Badge status={v.category} />
              <Badge status={v.status} />
            </div>
          </div>
        ))}
      </div>

      <a
        href={`/api/vouchers/export?period=${period}`}
        className="block text-center w-full mt-4 py-3.5 bg-ar-goldfill border border-ar-goldline rounded-xl text-ar-gold2 text-[11px] font-semibold tracking-[0.16em] uppercase"
      >
        Unduh Rekap {data?.periodLabel ?? ""} (CSV)
      </a>
    </div>
  );
}
