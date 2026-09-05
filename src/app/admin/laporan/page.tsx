"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

type Period = "harian" | "mingguan" | "bulanan";

interface ReportRow {
  name: string;
  level: string;
  silver: number;
  plat: number;
  kasbon: string;
  net: string;
}

interface Report {
  periodLabel: string;
  rows: ReportRow[];
  totals: { silver: number; plat: number; kasbon: string; net: string };
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "harian", label: "Harian" },
  { key: "mingguan", label: "Mingguan" },
  { key: "bulanan", label: "Bulanan" },
];

const cols = "1.7fr .9fr .8fr .8fr 1fr 1fr";

export default function LaporanPage() {
  const [period, setPeriod] = useState<Period>("harian");
  const [data, setData] = useState<Report | null>(null);

  useEffect(() => {
    fetch(`/api/admin/report?period=${period}`)
      .then((r) => r.json())
      .then(setData);
  }, [period]);

  return (
    <div>
      <AdminPageHeader title="Rekap Pendapatan" subtitle="Harian, mingguan, bulanan — dapat diunduh sebagai CSV" />

      <div className="pt-5.5">
        <div className="flex flex-wrap gap-2.5 items-center justify-between mb-4">
          <div className="flex gap-1.5 p-[5px] bg-ar-surface2 rounded-[11px]">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`py-2.5 px-4 rounded-lg text-[11px] font-semibold tracking-[0.14em] uppercase cursor-pointer ${
                  period === p.key ? "bg-ar-goldfill text-ar-gold2 shadow-[inset_0_0_0_1px_var(--ar-goldline)]" : "text-ar-dim"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <a
            href={`/api/admin/report/export?period=${period}`}
            className="py-3 px-5 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase"
          >
            Unduh CSV · {data?.periodLabel ?? ""}
          </a>
        </div>

        <div className="bg-ar-surface border border-ar-line rounded-2xl overflow-hidden">
          <div className="grid gap-3 py-3.5 px-4.5 bg-ar-surface2 text-[10px] tracking-[0.14em] uppercase text-ar-dim" style={{ gridTemplateColumns: cols }}>
            <span>Karyawan</span>
            <span>Level</span>
            <span>Silver</span>
            <span>Platinum</span>
            <span>Kasbon</span>
            <span>Diterima</span>
          </div>
          {data?.rows.map((r, i) => (
            <div key={i} className="grid gap-3 py-3.5 px-4.5 border-t border-ar-line text-[12.5px] items-center" style={{ gridTemplateColumns: cols }}>
              <span>{r.name}</span>
              <span className={r.level === "PLATINUM" ? "text-ar-gold2" : "text-ar-dim"}>{r.level === "PLATINUM" ? "Platinum" : "Silver"}</span>
              <span>{r.silver}</span>
              <span>{r.plat}</span>
              <span className="text-ar-red">{r.kasbon}</span>
              <span className="font-display text-[18px] text-ar-gold2">{r.net}</span>
            </div>
          ))}
          {data && (
            <div
              className="grid gap-3 py-4 px-4.5 border-t border-ar-goldline bg-ar-goldfill text-[12.5px] items-center"
              style={{ gridTemplateColumns: cols }}
            >
              <span className="tracking-[0.14em] uppercase text-[10.5px] text-ar-gold">Total {data.periodLabel}</span>
              <span />
              <span>{data.totals.silver}</span>
              <span>{data.totals.plat}</span>
              <span className="text-ar-red">{data.totals.kasbon}</span>
              <span className="font-display text-xl text-ar-gold2">{data.totals.net}</span>
            </div>
          )}
        </div>
        <div className="mt-3.5 py-4 px-4.5 bg-ar-surface2 border border-ar-line rounded-2xl text-[11.5px] leading-[1.75] text-ar-dim">
          File CSV terbuka di Excel dan Google Sheets. Isi kolom: tanggal, kode karyawan, nama, level, kategori voucher, nilai,
          klien, status pencairan.
        </div>
      </div>
    </div>
  );
}
