import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { parsePeriod } from "@/lib/period";
import { fmtRp, shortRp } from "@/lib/format";
import { buildOperationalReport } from "@/lib/report-data";

const neg = (n: number) => (n ? "-" + shortRp(n) : "—");

export async function GET(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const { searchParams } = new URL(req.url);
    const report = await buildOperationalReport(parsePeriod(searchParams.get("period")));
    const t = report.totals;

    return NextResponse.json({
      period: report.period,
      periodLabel: report.periodLabel,
      // Terapis (paid by voucher)
      rows: report.tera.map((r) => ({
        name: r.name,
        level: r.level,
        voucherCount: r.voucherCount,
        rateLabel: fmtRp(r.rate),
        kasbon: neg(r.kasbon),
        net: shortRp(r.net),
      })),
      totals: { voucherCount: t.teraVoucherCount, kasbon: neg(t.teraKasbon), net: shortRp(t.teraNet) },
      // Karyawan (fixed monthly Gaji, shown for the chosen period)
      staffRows: report.staff.map((r) => ({
        name: r.name,
        role: r.role,
        monthlySalary: shortRp(r.monthlySalary),
        pay: shortRp(r.pay),
        kasbon: neg(r.kasbon),
        net: shortRp(r.net),
      })),
      staffTotals: { pay: shortRp(t.staffPay), kasbon: neg(t.staffKasbon), net: shortRp(t.staffNet) },
      // Pengeluaran gaji
      summary: {
        teraPay: shortRp(t.teraGross),
        staffPay: shortRp(t.staffPay),
        payroll: shortRp(t.payroll),
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
