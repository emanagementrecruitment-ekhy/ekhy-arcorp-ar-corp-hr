import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { parseMonth } from "@/lib/period";
import { ensureAttendancePenalty } from "@/lib/payslip";
import { deliverPayslip } from "@/lib/payslip-delivery";

export async function POST(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const body = await req.json().catch(() => null);
    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const month = parseMonth(typeof body?.month === "string" ? body.month : null);
    if (!employeeId) return NextResponse.json({ error: "Pilih karyawan dulu." }, { status: 400 });

    await ensureAttendancePenalty(employeeId, month);
    const result = await deliverPayslip(employeeId, month);
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}
