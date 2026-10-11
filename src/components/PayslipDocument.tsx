"use client";

import Image from "next/image";
import type { Payslip } from "@/lib/payslip";

function fmtRp(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

function fmtNum(n: number): string {
  const v = Math.round(n);
  return v < 0 ? `(${Math.abs(v).toLocaleString("id-ID")})` : v.toLocaleString("id-ID");
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
export default function PayslipDocument({
  payslip,
  onDeleteItem,
  onEditItem,
  onDeleteSaving,
}: {
  payslip: Payslip;
  onDeleteItem?: (id: string) => void;
  onEditItem?: (id: string) => void;
  onDeleteSaving?: (id: string) => void;
}) {
  return (
    <div id="payslip-print-area" className="bg-ar-surface border border-ar-goldline rounded-2xl p-6 print:border-0 print:rounded-none print:p-0 print:bg-white">
      <div className="flex items-center gap-3 mb-5 print:mb-4">
        <Image
          src="/api/brand-logo"
          alt="AR Corp"
          width={52}
          height={52}
          unoptimized
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
        <div>
          <span className="text-ar-dim print:text-black/60">Outlet/Lokasi Kerja</span> : {payslip.employee.place}
        </div>
        <div>
          <span className="text-ar-dim print:text-black/60">Absensi Bulan Ini</span> :{" "}
          {payslip.attendance.trackingStarted
            ? `${payslip.attendance.hariHadir}/${payslip.attendance.totalDays} hari (${payslip.attendance.persen}%)`
            : "—"}
        </div>
      </div>

      <div className="text-[10px] tracking-[0.16em] uppercase text-ar-gold mb-2 print:text-black print:font-bold">
        Rincian Payroll
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[8px] leading-[1.15] border-collapse print:text-black">
          <thead>
            <tr className="text-center text-[7px] tracking-[0.06em] uppercase text-ar-dim print:text-black">
              <th rowSpan={2} className="py-1 px-1 font-semibold border border-ar-line print:border-black">No</th>
              <th rowSpan={2} className="py-1 px-1 font-semibold border border-ar-line print:border-black">Tanggal</th>
              <th rowSpan={2} colSpan={2} className="py-1 px-1 font-semibold border border-ar-line print:border-black">Rincian</th>
              <th rowSpan={2} className="py-1 px-1 font-semibold border border-ar-line print:border-black">Qty</th>
              <th colSpan={2} className="py-1 px-1 font-semibold border border-ar-line print:border-black">Debit</th>
              <th colSpan={2} className="py-1 px-1 font-semibold border border-ar-line print:border-black">Kredit</th>
              <th rowSpan={2} className="py-1 px-1 font-semibold border border-ar-line print:border-black">Jumlah Totalan</th>
              <th rowSpan={2} className="py-1 px-1 font-semibold border border-ar-line print:border-black">Keterangan</th>
              {onDeleteItem && <th rowSpan={2} className="print:hidden" />}
            </tr>
            <tr className="text-center text-[7px] tracking-[0.06em] uppercase text-ar-dim print:text-black">
              <th className="py-0.5 px-1 font-semibold border border-ar-line print:border-black">Jumlah</th>
              <th className="py-0.5 px-1 font-semibold border border-ar-line print:border-black">Total</th>
              <th className="py-0.5 px-1 font-semibold border border-ar-line print:border-black">Jumlah</th>
              <th className="py-0.5 px-1 font-semibold border border-ar-line print:border-black">Total</th>
            </tr>
          </thead>
          <tbody>
            {payslip.sheet.map((r) => {
              const isTop = r.blockSpan === 1 && r.blockLabel === null;
              const cell = "py-0.5 px-1 border border-ar-line print:border-black";
              return (
                <tr key={r.key}>
                  <td className={`${cell} text-center`}>{r.no}</td>
                  <td className={cell}>{r.date ?? ""}</td>
                  {isTop ? (
                    <td colSpan={2} className={`${cell} ${r.filler ? "text-ar-dim" : "text-ar-gold2"} print:text-black`}>
                      {r.description}
                    </td>
                  ) : (
                    <>
                      {r.blockSpan > 0 && (
                        <td rowSpan={r.blockSpan} className={`${cell} text-center font-bold align-middle`}>
                          {r.blockLabel}
                        </td>
                      )}
                      <td className={cell}>{r.description}</td>
                    </>
                  )}
                  <td className={`${cell} text-center`}>{r.qty ?? ""}</td>
                  <td className={`${cell} text-right`}>{r.debitUnit ? fmtNum(r.debitUnit) : ""}</td>
                  <td className={`${cell} text-right`}>{r.debitTotal ? fmtNum(r.debitTotal) : ""}</td>
                  <td className={`${cell} text-right`}>{r.creditUnit ? fmtNum(r.creditUnit) : ""}</td>
                  {isTop ? (
                    <td className={`${cell} text-right text-ar-red print:text-black`}>{r.creditTotal ? fmtNum(r.creditTotal) : ""}</td>
                  ) : (
                    r.blockSpan > 0 && (
                      <td rowSpan={r.blockSpan} className={`${cell} text-right align-middle`}>
                        {r.creditTotal ? fmtNum(r.creditTotal) : ""}
                      </td>
                    )
                  )}
                  <td className={`${cell} text-right font-display text-ar-gold2 print:text-black`}>{fmtNum(r.balance)}</td>
                  <td className={cell}>{r.note ?? ""}</td>
                  {onDeleteItem && (
                    <td className="py-0.5 pl-1 print:hidden whitespace-nowrap">
                      {r.id && (
                        <span className="flex gap-2.5">
                          {onEditItem && (
                            <button onClick={() => onEditItem(r.id!)} className="text-ar-gold text-[10.5px] cursor-pointer">
                              Edit
                            </button>
                          )}
                          <button onClick={() => onDeleteItem(r.id!)} className="text-ar-red text-[10.5px] cursor-pointer">
                            Hapus
                          </button>
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4 pt-4 border-t border-ar-goldline print:border-black">
        <span className="text-[10.5px] tracking-[0.16em] uppercase text-ar-gold print:text-black print:font-bold">
          Total Payroll
        </span>
        <span className="font-display text-2xl text-ar-gold2 print:text-black">{fmtRp(payslip.total)}</span>
      </div>

      {payslip.savings.length > 0 && (
        <div className="mt-5 pt-4 border-t border-ar-line print:border-black/30">
          <div className="text-[10px] tracking-[0.16em] uppercase text-ar-gold mb-2 print:text-black print:font-bold">
            Catatan Tabungan
          </div>
          <div className="text-[10px] text-ar-faint mb-2 print:hidden">
            Riwayat menabung — tidak memotong Total Payroll di atas.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px] border-collapse print:text-black">
              <thead>
                <tr className="text-left text-[9.5px] tracking-[0.1em] uppercase text-ar-dim border-b border-ar-line print:text-black print:border-black">
                  <th className="py-2 pr-2 font-normal">Tanggal</th>
                  <th className="py-2 pr-2 font-normal text-right">Nominal</th>
                  <th className="py-2 pr-2 font-normal">Keterangan</th>
                  {onDeleteSaving && <th className="py-2 font-normal print:hidden" />}
                </tr>
              </thead>
              <tbody>
                {payslip.savings.map((s) => (
                  <tr key={s.id} className="border-b border-ar-line/60 print:border-black/30">
                    <td className="py-2 pr-2">{s.date}</td>
                    <td className="py-2 pr-2 text-right font-display text-ar-gold2 print:text-black">{fmtRp(s.amount)}</td>
                    <td className="py-2 pr-2">{s.note ?? "—"}</td>
                    {onDeleteSaving && (
                      <td className="py-2 print:hidden">
                        <button onClick={() => onDeleteSaving(s.id)} className="text-ar-red text-[10.5px] cursor-pointer">
                          Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
