import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES, PAYSLIP_COST_CATEGORIES, usesVcr } from "@/lib/constants";
import { parseMonth } from "@/lib/period";
import { monthLabel } from "@/lib/format";
import { ensureRecurringCosts, buildPayslip } from "@/lib/payslip";

export async function GET(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId") ?? "";
    if (!employeeId) return NextResponse.json({ error: "Pilih karyawan dulu." }, { status: 400 });

    const rows = await prisma.recurringCost.findMany({ where: { employeeId }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({
      recurringCosts: rows.map((r) => ({
        id: r.id,
        category: r.category,
        amount: r.amount,
        note: r.note,
        startMonth: r.startMonth,
        startMonthLabel: monthLabel(r.startMonth),
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const body = await req.json().catch(() => null);

    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const category = typeof body?.category === "string" ? body.category.trim() : "";
    const amount = Math.max(0, Math.round(Number(body?.amount) || 0));
    const note = typeof body?.note === "string" ? body.note.trim() : "";
    const startMonth = parseMonth(typeof body?.startMonth === "string" ? body.startMonth : null);

    if (!employeeId) return NextResponse.json({ error: "Pilih karyawan dulu." }, { status: 400 });
    if (!(PAYSLIP_COST_CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json({ error: "Pilih kategori Penambahan Biaya." }, { status: 400 });
    }
    if (amount <= 0) return NextResponse.json({ error: "Isi nominal." }, { status: 400 });

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.accessRole !== "KARYAWAN") {
      return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    }
    if (!usesVcr(employee.role)) {
      return NextResponse.json({ error: "Penambahan Biaya berulang hanya berlaku untuk Tera." }, { status: 400 });
    }

    await prisma.recurringCost.create({
      data: { employeeId, category, amount, note: note || null, startMonth },
    });

    await ensureRecurringCosts(employeeId, startMonth);
    const payslip = await buildPayslip(employeeId, startMonth);
    return NextResponse.json({ ok: true, payslip });
  } catch (e) {
    return apiError(e);
  }
}
