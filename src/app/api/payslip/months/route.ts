import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { listPayslipMonths } from "@/lib/payslip";
import { monthLabel } from "@/lib/format";

export async function GET() {
  try {
    const session = await requireSession(["KARYAWAN"]);
    const months = await listPayslipMonths(session.employeeId);
    return NextResponse.json({ months: months.map((m) => ({ month: m, label: monthLabel(m) })) });
  } catch (e) {
    return apiError(e);
  }
}
