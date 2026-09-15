"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PayslipDocument from "@/components/PayslipDocument";
import type { Payslip } from "@/lib/payslip";
import { downloadFile } from "@/lib/client-download";
import { describePayslipDelivery } from "@/lib/payslip-delivery-message";

export default function PayslipMonthPage() {
  const params = useParams<{ month: string }>();
  const router = useRouter();
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendMsg, setSendMsg] = useState("");

  useEffect(() => {
    fetch(`/api/payslip?month=${params.month}`)
      .then((r) => r.json())
      .then((d) => setPayslip(d.error ? null : d));
  }, [params.month]);

  async function saveAsPdf() {
    setPdfBusy(true);
    try {
      await downloadFile(`/api/payslip/pdf?month=${params.month}`, "Slip Pay.pdf");
    } finally {
      setPdfBusy(false);
    }
  }

  async function sendToContacts() {
    setSendBusy(true);
    setSendMsg("");
    try {
      const res = await fetch("/api/payslip/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: params.month }),
      });
      const data = await res.json();
      setSendMsg(res.ok ? describePayslipDelivery(data) : data.error ?? "Gagal mengirim.");
    } finally {
      setSendBusy(false);
    }
  }

  return (
    <div>
      <button onClick={() => router.push("/app/payslip")} className="text-ar-dim text-[11px] mb-3 cursor-pointer">
        ← Kembali
      </button>

      {!payslip && <div className="text-[12px] text-ar-faint py-3">Memuat…</div>}
      {payslip && (
        <div className="flex flex-col gap-3">
          <div className="self-end flex flex-wrap justify-end gap-2.5">
            <button
              onClick={() => window.print()}
              className="py-2.5 px-4 bg-ar-surface2 border border-ar-goldline rounded-[10px] text-ar-gold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer"
            >
              Print
            </button>
            <button
              disabled={pdfBusy}
              onClick={saveAsPdf}
              className="py-2.5 px-4 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60"
            >
              {pdfBusy ? "Menyiapkan…" : "Simpan PDF"}
            </button>
            <button
              disabled={sendBusy}
              onClick={sendToContacts}
              className="py-2.5 px-4 bg-ar-surface2 border border-ar-goldline rounded-[10px] text-ar-gold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60"
            >
              {sendBusy ? "Mengirim…" : "Kirim Email/WA"}
            </button>
          </div>
          {sendMsg && <div className="self-end text-[11px] text-ar-dim text-right max-w-[320px]">{sendMsg}</div>}
          <PayslipDocument payslip={payslip} />
        </div>
      )}
    </div>
  );
}
