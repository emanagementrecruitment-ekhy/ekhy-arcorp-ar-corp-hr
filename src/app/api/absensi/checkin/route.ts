import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { markAttendanceToday } from "@/lib/attendance";

/** Self check-in — the box the employee/Tera taps to mark themselves present today. */
export async function POST() {
  try {
    const session = await requireSession(["KARYAWAN"]);
    const result = await markAttendanceToday(session.employeeId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return apiError(e);
  }
}
