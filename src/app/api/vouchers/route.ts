import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { parsePeriod, periodStart, PERIOD_LABEL } from "@/lib/period";
import { fmtRp, shortRp, dayLabel, timeLabel, dLabel } from "@/lib/format";
import {
  VOUCHER_LABEL,
  VOUCHER_STATUS_LABEL,
  VOUCHER_AMOUNT,
  employeeRate,
  isTravelPlace,
  usesVcr,
  type EmployeeLevel,
  type VoucherStatus,
} from "@/lib/constants";
import { notifyOffice } from "@/lib/notify";
import { parseVoucherEntry } from "@/lib/voucher-entry";
import { monthRange, parseMonth } from "@/lib/period";
import { jakartaDay } from "@/lib/payslip";

export async function GET(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN", "SUPERVISOR"]);
    const { searchParams } = new URL(req.url);
    const period = parsePeriod(searchParams.get("period"));
    const now = new Date();
    const start = periodStart(now, period);

    const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
    if (!employee) return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    const vcr = usesVcr(employee.role);
    const myLevel = employee.level as EmployeeLevel;

    if (!vcr) {
      return NextResponse.json({
        usesVcr: false,
        salary: fmtRp(employee.salary ?? 0),
      });
    }

    const [all, periodVouchers] = await Promise.all([
      prisma.voucher.findMany({ where: { employeeId: session.employeeId } }),
      prisma.voucher.findMany({
        where: { employeeId: session.employeeId, occurredAt: { gte: start } },
        orderBy: { occurredAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      usesVcr: true,
      period,
      periodLabel: PERIOD_LABEL[period],
      periodRange: `${dLabel(start)} – ${dLabel(now)}`,
      myLevel,
      myLevelLabel: VOUCHER_LABEL[myLevel],
      myRate: employeeRate(myLevel, employee.customRate),
      myPlace: employee.homePlace,
      sd: isTravelPlace(employee.homePlace),
      sdRates: { S: VOUCHER_AMOUNT.FL, D: VOUCHER_AMOUNT.CLASSIC_D },
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
          amount: `+${shortRp(v.amount).replace("Rp ", "")}`,
        })),
    });
  } catch (e) {
    return apiError(e);
  }
}

/**
 * Self-service daily income entry for field employees ("Tera"/karyawan) —
 * they only ever input how many VCR they got today. The rate AND the
 * location both come from the employee's own record in the DB, never from
 * the client: rate from their registered level (a Silver-rate employee can
 * only ever log Silver vouchers), location from their homePlace as set by
 * head office (Data Karyawan / Lokasi & Absensi) — it isn't pickable here.
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN", "SUPERVISOR"]);
    const body = await req.json().catch(() => null);

    const occurredAtRaw = typeof body?.occurredAt === "string" ? body.occurredAt : "";
    const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
    if (Number.isNaN(occurredAt.getTime())) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });

    const employee = await prisma.employee.findUnique({ where: { id: session.employeeId } });
    if (!employee) return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    if (!usesVcr(employee.role)) {
      return NextResponse.json({ error: "Pendapatan/VCR tidak berlaku untuk peran Anda — gaji diatur oleh admin." }, { status: 400 });
    }

    // Travel / Classic T5 Tera enter S and D separately, like their Slip Pay.
    const entry = parseVoucherEntry(isTravelPlace(employee.homePlace), body);
    if (!entry.ok) return NextResponse.json({ error: entry.error }, { status: 400 });

    const level = employee.level as EmployeeLevel;
    const { start, end } = monthRange(parseMonth(jakartaDay(occurredAt).slice(0, 7)));
    const data: Array<{ employeeId: string; category: string; client: string; amount: number; occurredAt: Date }> = [];
    let count = 0;
    let total = 0;
    for (const line of entry.lines) {
      let category: EmployeeLevel = level;
      let amount = employeeRate(level, employee.customRate);
      if (line.category) {
        // Keep the nominal the office set for this category this month, else the default.
        category = line.category;
        const last = await prisma.voucher.findFirst({
          where: { employeeId: employee.id, category, occurredAt: { gte: start, lt: end } },
          orderBy: { occurredAt: "desc" },
          select: { amount: true },
        });
        amount = last?.amount ?? VOUCHER_AMOUNT[category];
      }
      for (let i = 0; i < line.qty; i++) data.push({ employeeId: employee.id, category, client: employee.homePlace, amount, occurredAt });
      count += line.qty;
      total += amount * line.qty;
    }
    await prisma.voucher.createMany({ data });

    await notifyOffice(`Pendapatan baru dari ${employee.name} (self-entry): ${count} voucher · ${fmtRp(total)}`);

    await logAudit(session, "VOUCHER_SELF", `${employee.name} (${employee.code})`, `${count} voucher · ${fmtRp(total)}`);
    return NextResponse.json({ ok: true, count, total });
  } catch (e) {
    return apiError(e);
  }
}
