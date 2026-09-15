import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { parseMonth } from "@/lib/period";
import { buildPayslip } from "@/lib/payslip";

/** Edits the nominal/keterangan of a recurring cost — applies to this and every future month; past-generated rows are untouched. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(OFFICE_ROLES);
    const { id } = await params;
    const body = await req.json().catch(() => null);

    const existing = await prisma.recurringCost.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Penambahan Biaya tidak ditemukan." }, { status: 404 });

    const amount = Math.max(0, Math.round(Number(body?.amount) || 0));
    const note = typeof body?.note === "string" ? body.note.trim() : "";
    if (amount <= 0) return NextResponse.json({ error: "Isi nominal." }, { status: 400 });

    await prisma.recurringCost.update({ where: { id }, data: { amount, note: note || null } });

    const month = parseMonth(typeof body?.month === "string" ? body.month : null);
    const payslip = await buildPayslip(existing.employeeId, month);
    return NextResponse.json({ ok: true, payslip });
  } catch (e) {
    return apiError(e);
  }
}

/** Stops future billing — only removes the template, never the PayslipItem rows it already generated for past/current months. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(OFFICE_ROLES);
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const existing = await prisma.recurringCost.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Penambahan Biaya tidak ditemukan." }, { status: 404 });

    await prisma.recurringCost.delete({ where: { id } });

    const month = parseMonth(searchParams.get("month"));
    const payslip = await buildPayslip(existing.employeeId, month);
    return NextResponse.json({ ok: true, payslip });
  } catch (e) {
    return apiError(e);
  }
}
