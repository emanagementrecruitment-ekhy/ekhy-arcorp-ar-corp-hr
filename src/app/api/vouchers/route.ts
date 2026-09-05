import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { parsePeriod, periodStart, PERIOD_LABEL } from "@/lib/period";
import { fmtRp, dayLabel, timeLabel, dLabel } from "@/lib/format";
import { VOUCHER_LABEL, VOUCHER_STATUS_LABEL, type EmployeeLevel, type VoucherStatus } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN"]);
    const { searchParams } = new URL(req.url);
    const period = parsePeriod(searchParams.get("period"));
    const now = new Date();
    const start = periodStart(now, period);

    const [all, periodVouchers] = await Promise.all([
      prisma.voucher.findMany({ where: { employeeId: session.employeeId } }),
      prisma.voucher.findMany({
        where: { employeeId: session.employeeId, occurredAt: { gte: start } },
        orderBy: { occurredAt: "desc" },
      }),
    ]);

    const unpaid = all.filter((v) => v.status !== "DICAIRKAN");

    return NextResponse.json({
      period,
      periodLabel: PERIOD_LABEL[period],
      periodRange: `${dLabel(start)} – ${dLabel(now)}`,
      saldo: {
        total: fmtRp(unpaid.reduce((s, v) => s + v.amount, 0)),
        count: unpaid.length,
        silverCount: unpaid.filter((v) => v.category === "SILVER").length,
        platinumCount: unpaid.filter((v) => v.category === "PLATINUM").length,
      },
      vouchers: periodVouchers.map((v) => ({
        id: v.id,
        client: v.client,
        dateLabel: dayLabel(v.occurredAt),
        time: timeLabel(v.occurredAt),
        code: v.id.slice(0, 8).toUpperCase(),
        amountLabel: fmtRp(v.amount),
        category: VOUCHER_LABEL[v.category as EmployeeLevel],
        status: VOUCHER_STATUS_LABEL[v.status as VoucherStatus],
      })),
      periodTotal: fmtRp(periodVouchers.reduce((s, v) => s + v.amount, 0)),
      periodCount: periodVouchers.length,
      recentFeed: all
        .slice()
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
        .slice(0, 5)
        .map((v) => ({
          title: v.client,
          meta: `${VOUCHER_LABEL[v.category as EmployeeLevel]} · ${dLabel(v.occurredAt)} ${timeLabel(v.occurredAt)}`,
          amount: v.category === "PLATINUM" ? "+400rb" : "+150rb",
        })),
    });
  } catch (e) {
    return apiError(e);
  }
}
