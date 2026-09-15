import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { getAttendanceDashboard } from "@/lib/attendance";
import { shortRp } from "@/lib/format";

export async function GET(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const { searchParams } = new URL(req.url);
    const dashboard = await getAttendanceDashboard(searchParams.get("month"));

    return NextResponse.json({
      ...dashboard,
      totalVcrThisMonthLabel: shortRp(dashboard.totalVcrThisMonth),
    });
  } catch (e) {
    return apiError(e);
  }
}
