import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { buildPayslip } from "@/lib/payslip";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(OFFICE_ROLES);
    const { id } = await params;

    const existing = await prisma.payslipItem.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Rincian tidak ditemukan." }, { status: 404 });

    await prisma.payslipItem.delete({ where: { id } });

    const payslip = await buildPayslip(existing.employeeId, existing.month);
    return NextResponse.json({ ok: true, payslip });
  } catch (e) {
    return apiError(e);
  }
}

/** Edits an existing row in place — the recurring/auto rows (Pinalty Absensi, RecurringCost-generated) can be corrected this way too, not just deleted. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(OFFICE_ROLES);
    const { id } = await params;
    const body = await req.json().catch(() => null);

    const existing = await prisma.payslipItem.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Rincian tidak ditemukan." }, { status: 404 });

    const dateRaw = typeof body?.date === "string" ? body.date : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const qty = typeof body?.qty === "string" ? body.qty.trim() : "";
    const debit = Math.max(0, Math.round(Number(body?.debit) || 0));
    const credit = Math.max(0, Math.round(Number(body?.credit) || 0));
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    if (!description) return NextResponse.json({ error: "Rincian wajib diisi." }, { status: 400 });
    if (debit <= 0 && credit <= 0) {
      return NextResponse.json({ error: "Isi nominal Debit atau Kredit." }, { status: 400 });
    }

    let date: Date | null = null;
    if (dateRaw) {
      date = new Date(dateRaw);
      if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    }

    await prisma.payslipItem.update({
      where: { id },
      data: { date, description, qty: qty || null, debit, credit, note: note || null },
    });

    const payslip = await buildPayslip(existing.employeeId, existing.month);
    return NextResponse.json({ ok: true, payslip });
  } catch (e) {
    return apiError(e);
  }
}
