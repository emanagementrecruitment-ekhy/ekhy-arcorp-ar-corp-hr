import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { parsePeriod, periodStart, PERIOD_LABEL } from "@/lib/period";
import { fmtRp, dayLabel, timeLabel, dLabel } from "@/lib/format";
import {
  FIELD_CITIES,
  VOUCHER_LABEL,
  VOUCHER_STATUS_LABEL,
  employeeRate,
  type EmployeeLevel,
  type VoucherStatus,
} from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN"]);
    const { searchParams } = new URL(req.url);
    const period = parsePeriod(searchParams.get("period"));
    const now = new Date();
    const start = periodStart(now, period);

    const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
    if (!employee) return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    const myLevel = employee.level as EmployeeLevel;

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
      myLevel,
      myLevelLabel: VOUCHER_LABEL[myLevel],
      myRate: employeeRate(myLevel, employee.customRate),
      myPlace: employee.homePlace,
      places: FIELD_CITIES.map((c) => c.place),
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

/**
 * Self-service daily income entry for field employees ("Tera"/karyawan).
 * The rate always comes from the employee's own registered level in the DB —
 * never from the client — so a Silver-rate employee can only ever log Silver
 * vouchers for themselves, matching the rate set from head office.
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN"]);
    const body = await req.json().catch(() => null);

    const client = typeof body?.client === "string" ? body.client.trim() : "";
    const qty = Math.round(Number(body?.qty));
    const occurredAtRaw = typeof body?.occurredAt === "string" ? body.occurredAt : "";

    if (!client || !FIELD_CITIES.some((c) => c.place === client)) {
      return NextResponse.json({ error: "Lokasi kerja tidak valid." }, { status: 400 });
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return NextResponse.json({ error: "Jumlah VCR tidak valid." }, { status: 400 });
    }

    const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
    if (Number.isNaN(occurredAt.getTime())) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });

    const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
    if (!employee) return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    const level = employee.level as EmployeeLevel;
    const amount = employeeRate(level, employee.customRate);

    await prisma.voucher.createMany({
      data: Array.from({ length: qty }, () => ({
        employeeId: employee.id,
        category: level,
        client,
        amount,
        occurredAt,
      })),
    });

    return NextResponse.json({ ok: true, count: qty, total: amount * qty });
  } catch (e) {
    return apiError(e);
  }
}
