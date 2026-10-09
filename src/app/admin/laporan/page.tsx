"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { VOUCHER_LABEL, type EmployeeLevel } from "@/lib/constants";

type Period = "harian" | "mingguan" | "bulanan";

interface TeraRow {
  name: string;
  level: string;
  voucherCount: number;
  rateLabel: string;
  kasbon: string;
  net: string;
}

interface StaffRow {
  name: string;
  role: string;
  monthlySalary: string;
  pay: string;
  kasbon: string;
  net: string;
}

interface Report {
  periodLabel: string;
  rows: TeraRow[];
  totals: { voucherCount: number; kasbon: string; net: string };
  staffRows: StaffRow[];
  staffTotals: { pay: string; kasbon: string; net: string };
  summary: { teraPay: string; staffPay: string; payroll: string };
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "harian", label: "Harian" },
  { key: "mingguan", label: "Mingguan" },
  { key: "bulanan", label: "Bulanan" },
];

const teraCols = "1.5fr 1fr .9fr 1.1fr 1fr 1.1fr";
const staffCols = "1.5fr 1.2fr 1fr 1fr 1fr 1.1fr";

// Small on purpose: the download/print buttons are secondary to the report itself.
const smallBtn =
  "py-1.5 px-3 rounded-lg border border-ar-goldline bg-ar-surface2 text-ar-gold text-[10px] font-bold tracking-[0.1em] uppercase cursor-pointer whitespace-nowrap";

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
      <AdminPageHeader
        title="Laporan Totalan"
        subtitle="Total operasional harian, mingguan, bulanan — pendapatan Terapis (VCR) dan gaji Karyawan dipisah"
      />

      <div className="pt-5.5">
        <div className="report-no-print flex flex-wrap gap-2.5 items-center justify-between mb-4">
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
          <div className="flex gap-2">
            <a href={`/api/admin/report/export?period=${period}`} className={smallBtn} title="Unduh total operasional sebagai CSV">
              ⬇ CSV
            </a>
            <button onClick={() => window.print()} className={smallBtn} title="Cetak laporan ini">
              🖨 Print
            </button>
          </div>
        </div>

        <div id="report-print-area">
          <div className="hidden print:block mb-3">
            <div className="font-display text-[20px]">AR Corp — Laporan Totalan {data?.periodLabel ?? ""}</div>
          </div>

          {data && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <SummaryCard label="Pendapatan Terapis" value={data.summary.teraPay} sub="total voucher periode ini" />
              <SummaryCard label="Gaji Karyawan" value={data.summary.staffPay} sub={`bagian gaji untuk ${data.periodLabel.toLowerCase()}`} />
              <SummaryCard label="Total Pengeluaran" value={data.summary.payroll} sub="Terapis + Karyawan, sebelum kasbon" strong />
            </div>
          )}

          <SectionTitle>Terapis</SectionTitle>
          <div className="bg-ar-surface border border-ar-line rounded-2xl overflow-x-auto mb-5">
            <div className="min-w-[640px]">
              <div className="grid gap-3 py-3.5 px-4.5 bg-ar-surface2 text-[10px] tracking-[0.14em] uppercase text-ar-dim" style={{ gridTemplateColumns: teraCols }}>
                <span>Tera</span>
                <span>Grade</span>
                <span>Total Voucher</span>
                <span>Pendapatan/Voucher</span>
                <span>Total Kasbon</span>
                <span>Sisa Gaji</span>
              </div>
              {data?.rows.length === 0 && <div className="py-5 px-4.5 text-[12px] text-ar-faint">Belum ada Tera.</div>}
              {data?.rows.map((r, i) => (
                <div key={i} className="grid gap-3 py-3.5 px-4.5 border-t border-ar-line text-[12.5px] items-center" style={{ gridTemplateColumns: teraCols }}>
                  <span>{r.name}</span>
                  <span className={r.level === "PLATINUM" || r.level === "MODEL" ? "text-ar-gold2" : "text-ar-dim"}>
                    {VOUCHER_LABEL[r.level as EmployeeLevel]}
                  </span>
                  <span>{r.voucherCount} vcr</span>
                  <span>{r.rateLabel}</span>
                  <span className="text-ar-red">{r.kasbon}</span>
                  <span className="font-display text-[18px] text-ar-gold2">{r.net}</span>
                </div>
              ))}
              {data && (
                <div className="grid gap-3 py-4 px-4.5 border-t border-ar-goldline bg-ar-goldfill text-[12.5px] items-center" style={{ gridTemplateColumns: teraCols }}>
                  <span className="tracking-[0.14em] uppercase text-[10.5px] text-ar-gold">Total Terapis</span>
                  <span />
                  <span>{data.totals.voucherCount} vcr</span>
                  <span />
                  <span className="text-ar-red">{data.totals.kasbon}</span>
                  <span className="font-display text-xl text-ar-gold2">{data.totals.net}</span>
                </div>
              )}
            </div>
          </div>

          <SectionTitle>Karyawan (gaji)</SectionTitle>
          <div className="bg-ar-surface border border-ar-line rounded-2xl overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid gap-3 py-3.5 px-4.5 bg-ar-surface2 text-[10px] tracking-[0.14em] uppercase text-ar-dim" style={{ gridTemplateColumns: staffCols }}>
                <span>Karyawan</span>
                <span>Peran</span>
                <span>Gaji Bulanan</span>
                <span>Gaji {data?.periodLabel ?? ""}</span>
                <span>Total Kasbon</span>
                <span>Sisa Gaji</span>
              </div>
              {data?.staffRows.length === 0 && <div className="py-5 px-4.5 text-[12px] text-ar-faint">Belum ada karyawan bergaji.</div>}
              {data?.staffRows.map((r, i) => (
                <div key={i} className="grid gap-3 py-3.5 px-4.5 border-t border-ar-line text-[12.5px] items-center" style={{ gridTemplateColumns: staffCols }}>
                  <span>{r.name}</span>
                  <span className="text-ar-dim">{r.role}</span>
                  <span>{r.monthlySalary}</span>
                  <span>{r.pay}</span>
                  <span className="text-ar-red">{r.kasbon}</span>
                  <span className="font-display text-[18px] text-ar-gold2">{r.net}</span>
                </div>
              ))}
              {data && (
                <div className="grid gap-3 py-4 px-4.5 border-t border-ar-goldline bg-ar-goldfill text-[12.5px] items-center" style={{ gridTemplateColumns: staffCols }}>
                  <span className="tracking-[0.14em] uppercase text-[10.5px] text-ar-gold">Total Karyawan</span>
                  <span />
                  <span />
                  <span>{data.staffTotals.pay}</span>
                  <span className="text-ar-red">{data.staffTotals.kasbon}</span>
                  <span className="font-display text-xl text-ar-gold2">{data.staffTotals.net}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="report-no-print mt-3.5 py-4 px-4.5 bg-ar-surface2 border border-ar-line rounded-2xl text-[11.5px] leading-[1.75] text-ar-dim">
          File CSV hanya berisi total operasional (Terapis, Karyawan, dan ringkasan pengeluaran). Rincian voucher satu per satu ada di
          Input Pendapatan. Gaji Karyawan dihitung per hari = gaji bulanan ÷ 30, per minggu = 7 hari, per bulan = 30 hari terakhir.
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="font-display text-[19px] text-ar-gold2 mb-2.5">{children}</div>;
}

function SummaryCard({ label, value, sub, strong }: { label: string; value: string; sub: string; strong?: boolean }) {
  return (
    <div className={`py-3.5 px-4.5 rounded-2xl border ${strong ? "bg-ar-goldfill border-ar-goldline" : "bg-ar-surface border-ar-line"}`}>
      <div className="text-[10px] tracking-[0.14em] uppercase text-ar-dim">{label}</div>
      <div className="font-display text-[24px] text-ar-gold2 mt-1">{value}</div>
      <div className="text-[10.5px] text-ar-faint mt-0.5">{sub}</div>
    </div>
  );
}
