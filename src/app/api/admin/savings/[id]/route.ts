import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { parseMonth } from "@/lib/period";
import { buildPayslip } from "@/lib/payslip";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(OFFICE_ROLES);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const month = parseMonth(searchParams.get("month"));

    const existing = await prisma.savingEntry.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Catatan Tabungan tidak ditemukan." }, { status: 404 });

    await prisma.savingEntry.delete({ where: { id } });

    const payslip = await buildPayslip(existing.employeeId, month);
    await logAudit(session, "SAVING_DELETE", "Tabungan", "Satu catatan tabungan dihapus");
    return NextResponse.json({ ok: true, payslip });
  } catch (e) {
    return apiError(e);
  }
}
