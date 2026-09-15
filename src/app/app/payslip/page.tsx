"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface MonthOption {
  month: string;
  label: string;
}

export default function PayslipMonthsPage() {
  const router = useRouter();
  const [months, setMonths] = useState<MonthOption[] | null>(null);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    fetch("/api/payslip/months")
      .then((r) => r.json())
      .then((d) => {
        const list: MonthOption[] = d.months ?? [];
        setMonths(list);
        setSelected(list[0]?.month ?? "");
      });
  }, []);

  return (
    <div>
      <div className="font-display text-[26px] pt-3 pb-1">Rincian Totalan</div>
      <div className="text-[11.5px] text-ar-dim mb-4">
        Slip Pay bulanan (5 bulan terakhir) — pilih bulan lalu lihat & simpan sebagai PDF.
      </div>

      {months === null && <div className="text-[12px] text-ar-faint py-3">Memuat…</div>}
      {months?.length === 0 && <div className="text-[12px] text-ar-faint py-3">Belum ada data.</div>}

      {months && months.length > 0 && (
        <div className="flex flex-col gap-3">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full py-3 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[13px]"
          >
            {months.map((m) => (
              <option key={m.month} value={m.month}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => selected && router.push(`/app/payslip/${selected}`)}
            className="w-full py-3 ar-grad rounded-[11px] text-ar-ongold text-xs font-bold tracking-[0.18em] uppercase cursor-pointer"
          >
            Lihat Slip Pay
          </button>
        </div>
      )}
    </div>
  );
}
