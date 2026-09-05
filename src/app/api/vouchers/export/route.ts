import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { parsePeriod, periodStart } from "@/lib/period";
import { toCsv, dayKey, timeLabel } from "@/lib/format";
import { VOUCHER_LABEL, VOUCHER_STATUS_LABEL, type EmployeeLevel, type VoucherStatus } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN"]);
    const { searchParams } = new URL(req.url);
    const period = parsePeriod(searchParams.get("period"));
    const now = new Date();
    const start = periodStart(now, period);

    const employee = await prisma.employee.findUniqueOrThrow({ where: { id: session.employeeId } });
    const vouchers = await prisma.voucher.findMany({
      where: { employeeId: session.employeeId, occurredAt: { gte: start } },
      orderBy: { occurredAt: "desc" },
    });

    const rows = [
      ["Tanggal", "Jam", "Kode", "Karyawan", "Level", "Kategori", "Nilai", "Klien", "Status"],
      ...vouchers.map((v) => [
        dayKey(v.occurredAt),
        timeLabel(v.occurredAt),
        v.id.slice(0, 8).toUpperCase(),
        employee.name,
        employee.level,
        VOUCHER_LABEL[v.category as EmployeeLevel],
        v.amount,
        v.client,
        VOUCHER_STATUS_LABEL[v.status as VoucherStatus],
      ]),
    ];

    const csv = toCsv(rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="AR-Corp-${employee.code}-${period}.csv"`,
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
