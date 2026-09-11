"use client";

import Image from "next/image";
import type { Payslip } from "@/lib/payslip";

function fmtRp(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

/**
 * Printable Slip Pay — shared by the admin Rincian Totalan page and the
 * karyawan self-service view so both produce the exact same document.
 * Renders in the app's dark/gold theme on screen; @media print (see
 * globals.css) flips everything to black-on-white and hides surrounding
 * chrome (sidebar/nav/buttons) so "Print" from the browser goes straight to
 * a clean one-page slip on whatever printer is set up on that computer —
 * or, on a phone, into the OS share sheet's "Save as PDF".
 */
export default function PayslipDocument({ payslip, onDeleteItem }: { payslip: Payslip; onDeleteItem?: (id: string) => void }) {
  return (
    <div id="payslip-print-area" className="bg-ar-surface border border-ar-goldline rounded-2xl p-6 print:border-0 print:rounded-none print:p-0 print:bg-white">
      <div className="flex items-center gap-3 mb-5 print:mb-4">
        <Image
          src="/ar-corp-logo.png"
          alt="AR Corp"
          width={52}
          height={52}
          className="rounded-full object-contain bg-ar-bg border border-ar-goldline print:border-black"
        />
        <div>
          <div className="font-display text-[13px] tracking-[0.3em] text-ar-gold uppercase print:text-black">AR Corp</div>
          <div className="font-display text-[22px] print:text-black">Slip Pay</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px] mb-5 print:mb-4 print:text-black">
        <div>
          <span className="text-ar-dim print:text-black/60">Nama</span> : <strong>{payslip.employee.name}</strong>
        </div>
        <div>
          <span className="text-ar-dim print:text-black/60">Bulan</span> : <strong>{payslip.monthLabel}</strong>
        </div>
        <div>
          <span className="text-ar-dim print:text-black/60">Divisi/Peran</span> : {payslip.employee.role}
        </div>
        <div>
          <span className="text-ar-dim print:text-black/60">Grade</span> : {payslip.employee.levelLabel}
        </div>
      </div>

      <div className="text-[10px] tracking-[0.16em] uppercase text-ar-gold mb-2 print:text-black print:font-bold">
        Rincian Payroll
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px] border-collapse print:text-black">
          <thead>
            <tr className="text-left text-[9.5px] tracking-[0.1em] uppercase text-ar-dim border-b border-ar-line print:text-black print:border-black">
              <th className="py-2 pr-2 font-normal">No</th>
              <th className="py-2 pr-2 font-normal">Tanggal</th>
              <th className="py-2 pr-2 font-normal">Rincian</th>
              <th className="py-2 pr-2 font-normal">Qty</th>
              <th className="py-2 pr-2 font-normal text-right">Debit</th>
              <th className="py-2 pr-2 font-normal text-right">Kredit</th>
              <th className="py-2 pr-2 font-normal text-right">Jumlah Totalan</th>
              {onDeleteItem && <th className="py-2 font-normal print:hidden" />}
            </tr>
          </thead>
          <tbody>
            {payslip.rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-center text-ar-faint print:text-black/50">
                  Belum ada rincian bulan ini.
                </td>
              </tr>
            )}
            {payslip.rows.map((r) => (
              <tr key={r.id ?? `auto-${r.no}`} className="border-b border-ar-line/60 print:border-black/30">
                <td className="py-2 pr-2">{r.no}</td>
                <td className="py-2 pr-2">{r.date ?? "—"}</td>
                <td className="py-2 pr-2">{r.description}</td>
                <td className="py-2 pr-2">{r.qty ?? "—"}</td>
                <td className="py-2 pr-2 text-right">{r.debit > 0 ? fmtRp(r.debit) : "—"}</td>
                <td className="py-2 pr-2 text-right">{r.credit > 0 ? fmtRp(r.credit) : "—"}</td>
                <td className="py-2 pr-2 text-right font-display text-[13px] text-ar-gold2 print:text-black">
                  {fmtRp(r.balance)}
                </td>
                {onDeleteItem && (
                  <td className="py-2 print:hidden">
                    {r.id && (
                      <button
                        onClick={() => onDeleteItem(r.id!)}
                        className="text-ar-red text-[10.5px] cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-ar-goldline print:border-black">
        <span className="text-[10.5px] tracking-[0.16em] uppercase text-ar-gold print:text-black print:font-bold">
          Total Payroll
        </span>
        <span className="font-display text-2xl text-ar-gold2 print:text-black">{fmtRp(payslip.total)}</span>
      </div>
    </div>
  );
}
