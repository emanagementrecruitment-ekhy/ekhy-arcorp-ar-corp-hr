import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { parseMonth } from "@/lib/period";
import { deliverPayslip } from "@/lib/payslip-delivery";

export async function POST(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN", "SUPERVISOR"]);
    const body = await req.json().catch(() => null);
    const month = parseMonth(typeof body?.month === "string" ? body.month : null);

    const result = await deliverPayslip(session.employeeId, month);
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}
