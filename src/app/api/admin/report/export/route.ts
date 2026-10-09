import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES, VOUCHER_LABEL } from "@/lib/constants";
import { parsePeriod } from "@/lib/period";
import { toCsv, dayKey } from "@/lib/format";
import { buildOperationalReport } from "@/lib/report-data";

/**
 * Operational totals only (Terapis and Karyawan pay for the period). The voucher-by-voucher detail
 * lives under Input Pendapatan, not here.
 */
export async function GET(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const { searchParams } = new URL(req.url);
    const period = parsePeriod(searchParams.get("period"));
    const report = await buildOperationalReport(period);
    const t = report.totals;

    const rows: (string | number)[][] = [
      [`Laporan Operasional ${report.periodLabel}`, `${dayKey(report.start)} s/d ${dayKey(new Date())}`],
      [],
      ["TERAPIS (per voucher)"],
      ["Kode", "Nama", "Grade", "Total Voucher", "Rate/Voucher", "Pendapatan Kotor", "Kasbon", "Sisa"],
      ...report.tera.map((r) => [r.code, r.name, VOUCHER_LABEL[r.level], r.voucherCount, r.rate, r.gross, r.kasbon, r.net]),
      ["Total Terapis", "", "", t.teraVoucherCount, "", t.teraGross, t.teraKasbon, t.teraNet],
      [],
      ["KARYAWAN (gaji)"],
      ["Kode", "Nama", "Peran", "Gaji Bulanan", `Gaji ${report.periodLabel}`, "Kasbon", "Sisa"],
      ...report.staff.map((r) => [r.code, r.name, r.role, r.monthlySalary, r.pay, r.kasbon, r.net]),
      ["Total Karyawan", "", "", "", t.staffPay, t.staffKasbon, t.staffNet],
      [],
      ["RINGKASAN PENGELUARAN GAJI"],
      ["Gaji/Pendapatan Terapis", t.teraGross],
      ["Gaji Karyawan", t.staffPay],
      ["Total Pengeluaran", t.payroll],
    ];

    return new Response(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="AR-Corp-operasional-${period}.csv"`,
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
