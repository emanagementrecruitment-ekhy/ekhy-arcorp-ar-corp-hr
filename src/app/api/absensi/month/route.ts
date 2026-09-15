import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { parseMonth } from "@/lib/period";
import { getEmployeeMonthAttendance, daysInMonth } from "@/lib/attendance";
import { ATTENDANCE_CHECKIN_START_MONTH } from "@/lib/constants";
import { dayKey } from "@/lib/format";

/** The employee/Tera's own month view — which days they've already checked in, for rendering their box grid. */
export async function GET(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN"]);
    const { searchParams } = new URL(req.url);
    const month = parseMonth(searchParams.get("month"));

    const marked = await getEmployeeMonthAttendance(session.employeeId, month);
    const today = new Date();
    const todayKey = dayKey(today);
    const isCurrentMonth = month === todayKey.slice(0, 7);

    return NextResponse.json({
      month,
      totalDays: daysInMonth(month),
      trackingStarted: month >= ATTENDANCE_CHECKIN_START_MONTH,
      markedDays: Array.from(marked).map((k) => Number(k.slice(8, 10))),
      todayDay: isCurrentMonth ? today.getDate() : null,
      checkedInToday: isCurrentMonth ? marked.has(todayKey) : false,
    });
  } catch (e) {
    return apiError(e);
  }
}
