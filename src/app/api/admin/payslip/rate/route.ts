import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { OFFICE_ROLES, usesVcr } from "@/lib/constants";
import { parseMonth } from "@/lib/period";
import { buildPayslip } from "@/lib/payslip";

/**
 * Types the per-voucher rate for a MANUAL-level Tera directly on that month's
 * Slip Pay — no need to edit the Tera's profile. An empty/0 rate clears it
 * (the slip goes back to the amounts stored on each voucher).
 */
export async function PUT(req: Request) {
  try {
    const session = await requireSession(OFFICE_ROLES);
    const body = await req.json().catch(() => null);
    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const month = parseMonth(typeof body?.month === "string" ? body.month : null);
    const rate = Math.round(Number(body?.rate) || 0);

    if (!employeeId) return NextResponse.json({ error: "Pilih karyawan dulu." }, { status: 400 });
    if (rate < 0 || rate > 100_000_000) return NextResponse.json({ error: "Nominal tidak valid." }, { status: 400 });

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || !usesVcr(employee.role)) return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    if (employee.level !== "MANUAL") {
      return NextResponse.json({ error: "Nominal hanya bisa diketik untuk level MANUAL INPUT." }, { status: 400 });
    }

    if (rate === 0) {
      await prisma.payslipRate.deleteMany({ where: { employeeId, month } });
    } else {
      await prisma.payslipRate.upsert({
        where: { employeeId_month: { employeeId, month } },
        create: { employeeId, month, rate },
        update: { rate },
      });
    }
    await logAudit(session, "PAYSLIP_EDIT", `${employee.name} (${employee.code}) · ${month}`, rate ? `Nominal MANUAL per VCR: Rp ${rate.toLocaleString("id-ID")}` : "Nominal MANUAL per VCR dikosongkan");

    const payslip = await buildPayslip(employeeId, month);
    return NextResponse.json({ ok: true, payslip });
  } catch (e) {
    return apiError(e);
  }
}