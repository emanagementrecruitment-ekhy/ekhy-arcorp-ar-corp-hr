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
