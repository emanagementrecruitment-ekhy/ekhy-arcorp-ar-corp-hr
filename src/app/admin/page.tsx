"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Badge from "@/components/Badge";

interface Overview {
  kpis: { label: string; value: string; sub: string }[];
  loginFeed: { name: string; mono: string; detail: string; status: string }[];
  bars: { label: string; value: number; heightPct: number }[];
  barsFrom: string;
  barsTo: string;
  silverAll: number;
  platAll: number;
}

export default function RingkasanPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div>
      <AdminPageHeader title="Ringkasan Operasional" subtitle="Aktivitas login, absensi, dan voucher komisi hari ini" />

      <div className="pt-5.5">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {(data?.kpis ?? Array.from({ length: 4 })).map((k, i) => (
            <div key={i} className="p-4.5 bg-ar-surface border border-ar-line rounded-2xl min-h-[92px]">
              {k ? (
                <>
                  <div className="text-[10px] tracking-[0.16em] uppercase text-ar-dim">{k.label}</div>
                  <div className="font-display text-[30px] text-ar-gold2 mt-1.5 leading-[1.1]">{k.value}</div>
                  <div className="text-[11px] text-ar-dim mt-1">{k.sub}</div>
                </>
              ) : null}
            </div>
          ))}
        </div>

        <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)" }}>
          <div className="p-5 bg-ar-surface border border-ar-line rounded-2xl">
            <div className="flex justify-between items-center gap-3 mb-3.5">
              <span className="text-[10.5px] tracking-[0.18em] uppercase text-ar-dim">Notifikasi login karyawan</span>
              <span className="text-[10.5px] text-ar-gold">real-time</span>
            </div>
            <div className="flex flex-col gap-2">
              {data?.loginFeed.length === 0 && <div className="text-[12px] text-ar-faint py-2">Belum ada aktivitas.</div>}
              {data?.loginFeed.map((l, i) => (
                <div key={i} className="flex items-center gap-3.5 py-3 px-3.5 bg-ar-surface2 border border-ar-line rounded-xl">
                  <span className="w-[34px] h-[34px] shrink-0 rounded-full border border-ar-goldline grid place-items-center font-display text-sm text-ar-gold">
                    {l.mono}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px]">{l.name}</span>
                    <span className="block text-[10.5px] text-ar-dim mt-1">{l.detail}</span>
                  </span>
                  <Badge status={l.status} />
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 bg-ar-surface border border-ar-line rounded-2xl flex flex-col">
            <div className="text-[10.5px] tracking-[0.18em] uppercase text-ar-dim mb-3.5">Voucher 14 hari terakhir</div>
            <div className="flex items-end gap-1.5 h-[150px] pb-0.5">
              {data?.bars.map((b, i) => (
                <span
                  key={i}
                  title={`${b.label} · ${b.value}`}
                  className="flex-1 min-w-0 rounded-t-sm rounded-b-[2px] border border-ar-goldline"
                  style={{
                    height: `${b.heightPct}%`,
                    background:
                      i === (data.bars.length ?? 0) - 1
                        ? "linear-gradient(180deg, var(--ar-gold2), var(--ar-gold))"
                        : "var(--ar-goldfill)",
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-ar-faint mt-2.5 pt-2.5 border-t border-ar-line">
              <span>{data?.barsFrom}</span>
              <span>{data?.barsTo}</span>
            </div>
            <div className="mt-auto pt-3.5 grid gap-1.5 text-[11.5px] text-ar-dim">
              <div className="flex justify-between">
                <span>Silver (150.000)</span>
                <span className="text-ar-text">{data?.silverAll ?? 0} voucher</span>
              </div>
              <div className="flex justify-between">
                <span>Platinum / Jasmine (400.000)</span>
                <span className="text-ar-text">{data?.platAll ?? 0} voucher</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
