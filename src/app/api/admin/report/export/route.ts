import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES, VOUCHER_LABEL, VOUCHER_STATUS_LABEL, type EmployeeLevel, type VoucherStatus } from "@/lib/constants";
import { parsePeriod, periodStart } from "@/lib/period";
import { toCsv, dayKey, timeLabel } from "@/lib/format";

export async function GET(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const { searchParams } = new URL(req.url);
    const period = parsePeriod(searchParams.get("period"));
    const now = new Date();
    const start = periodStart(now, period);

    const vouchers = await prisma.voucher.findMany({
      where: { occurredAt: { gte: start } },
      include: { employee: true },
      orderBy: { occurredAt: "desc" },
    });

    const rows = [
      ["Tanggal", "Jam", "Kode Karyawan", "Nama", "Level", "Kategori Voucher", "Nilai", "Klien", "Status Pencairan"],
      ...vouchers.map((v) => [
        dayKey(v.occurredAt),
        timeLabel(v.occurredAt),
        v.employee.code,
        v.employee.name,
        v.employee.level,
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
        "Content-Disposition": `attachment; filename="AR-Corp-rekap-${period}.csv"`,
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
