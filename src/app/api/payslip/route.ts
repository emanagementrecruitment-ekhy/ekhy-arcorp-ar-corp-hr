import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { parseMonth } from "@/lib/period";
import { buildPayslip } from "@/lib/payslip";

export async function GET(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN"]);
    const { searchParams } = new URL(req.url);
    const month = parseMonth(searchParams.get("month"));

    const payslip = await buildPayslip(session.employeeId, month);
    if (!payslip) return NextResponse.json({ error: "Data tidak ditemukan." }, { status: 404 });

    return NextResponse.json(payslip);
  } catch (e) {
    return apiError(e);
  }
}
