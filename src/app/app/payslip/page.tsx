"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface MonthOption {
  month: string;
  label: string;
}

export default function PayslipMonthsPage() {
  const [months, setMonths] = useState<MonthOption[] | null>(null);

  useEffect(() => {
    fetch("/api/payslip/months")
      .then((r) => r.json())
      .then((d) => setMonths(d.months ?? []));
  }, []);

  return (
    <div>
      <div className="font-display text-[26px] pt-3 pb-1">Rincian Totalan</div>
      <div className="text-[11.5px] text-ar-dim mb-4">Slip Pay bulanan — ketuk untuk lihat & simpan sebagai PDF.</div>

      <div className="flex flex-col gap-2.5">
        {months === null && <div className="text-[12px] text-ar-faint py-3">Memuat…</div>}
        {months?.length === 0 && <div className="text-[12px] text-ar-faint py-3">Belum ada data.</div>}
        {months?.map((m) => (
          <Link
            key={m.month}
            href={`/app/payslip/${m.month}`}
            className="flex items-center justify-between p-4 bg-ar-surface border border-ar-line rounded-[13px]"
          >
            <span className="flex items-center gap-3">
              <span className="text-[18px]">📄</span>
              <span className="text-[13px]">{m.label}</span>
            </span>
            <span className="text-ar-gold text-[11px]">Lihat →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
