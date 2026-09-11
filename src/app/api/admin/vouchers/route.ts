import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { EMPLOYEE_LEVELS, FIELD_CITIES, usesVcr, type EmployeeLevel } from "@/lib/constants";
import { fmtRp, dLabel, timeLabel, dayKey } from "@/lib/format";

const MANAGERS = ["OWNER", "CONSULTANT", "ADMIN_PUSAT"] as const;

export async function GET() {
  try {
    await requireSession([...MANAGERS]);
    // Pull a wide-enough window of raw rows to group properly, then collapse
    // to one line per employee per day — a single Excel import or self-entry
    // batch can create dozens of individual voucher rows, which used to
    // flood this list one row per voucher instead of one per day's activity.
    const vouchers = await prisma.voucher.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { employee: { select: { name: true, code: true } } },
    });

    const groups = new Map<
      string,
      { employeeName: string; employeeCode: string; count: number; total: number; occurredAt: Date; lastCreatedAt: Date }
    >();
    for (const v of vouchers) {
      const key = `${v.employeeId}_${dayKey(v.occurredAt)}`;
      const g = groups.get(key);
      if (g) {
        g.count += 1;
        g.total += v.amount;
        if (v.createdAt > g.lastCreatedAt) g.lastCreatedAt = v.createdAt;
      } else {
        groups.set(key, {
          employeeName: v.employee.name,
          employeeCode: v.employee.code,
          count: 1,
          total: v.amount,
          occurredAt: v.occurredAt,
          lastCreatedAt: v.createdAt,
        });
      }
    }

    const entries = Array.from(groups.entries())
      .sort((a, b) => b[1].lastCreatedAt.getTime() - a[1].lastCreatedAt.getTime())
      .slice(0, 20)
      .map(([id, g]) => ({
        id,
        employeeName: g.employeeName,
        employeeCode: g.employeeCode,
        count: g.count,
        amount: fmtRp(g.total),
        occurredAt: `${dLabel(g.occurredAt)} · ${timeLabel(g.lastCreatedAt)}`,
      }));

    return NextResponse.json({ vouchers: entries });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireSession([...MANAGERS]);
    const body = await req.json().catch(() => null);

    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const category = body?.category as EmployeeLevel;
    const client = typeof body?.client === "string" ? body.client.trim() : "";
    const occurredAtRaw = typeof body?.occurredAt === "string" ? body.occurredAt : "";
    const amount = Number(body?.amount);
    const qty = Number.isFinite(Number(body?.qty)) ? Math.round(Number(body?.qty)) : 1;

    if (!employeeId) return NextResponse.json({ error: "Pilih karyawan dulu." }, { status: 400 });
    if (!EMPLOYEE_LEVELS.includes(category)) return NextResponse.json({ error: "Level tidak valid." }, { status: 400 });
    if (!client || !FIELD_CITIES.some((c) => c.place === client)) {
      return NextResponse.json({ error: "Lokasi kerja tidak valid." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Nominal tidak valid." }, { status: 400 });
    if (!Number.isInteger(qty) || qty <= 0) return NextResponse.json({ error: "Jumlah VCR tidak valid." }, { status: 400 });

    const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
    if (Number.isNaN(occurredAt.getTime())) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.accessRole !== "KARYAWAN") {
      return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    }
    if (!usesVcr(employee.role)) {
      return NextResponse.json({ error: "Karyawan ini menerima Gaji, bukan Pendapatan/VCR." }, { status: 400 });
    }

    await prisma.voucher.createMany({
      data: Array.from({ length: qty }, () => ({ employeeId, category, client, amount, occurredAt })),
    });

    return NextResponse.json({ ok: true, count: qty, total: amount * qty });
  } catch (e) {
    return apiError(e);
  }
}
