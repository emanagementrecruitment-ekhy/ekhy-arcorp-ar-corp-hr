"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PayslipDocument from "@/components/PayslipDocument";
import type { Payslip } from "@/lib/payslip";

export default function PayslipMonthPage() {
  const params = useParams<{ month: string }>();
  const router = useRouter();
  const [payslip, setPayslip] = useState<Payslip | null>(null);

  useEffect(() => {
    fetch(`/api/payslip?month=${params.month}`)
      .then((r) => r.json())
      .then((d) => setPayslip(d.error ? null : d));
  }, [params.month]);

  return (
    <div>
      <button onClick={() => router.push("/app/payslip")} className="text-ar-dim text-[11px] mb-3 cursor-pointer">
        ← Kembali
      </button>

      {!payslip && <div className="text-[12px] text-ar-faint py-3">Memuat…</div>}
      {payslip && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.print()}
            className="self-end py-2.5 px-4 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer"
          >
            Print / Simpan PDF
          </button>
          <PayslipDocument payslip={payslip} />
        </div>
      )}
    </div>
  );
}
