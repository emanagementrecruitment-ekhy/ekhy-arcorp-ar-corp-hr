import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES, HQ, HQ_NAME, ATTENDANCE_RADIUS_KM } from "@/lib/constants";
import { timeLabel } from "@/lib/format";

export async function GET() {
  try {
    await requireSession(OFFICE_ROLES);

    const employees = await prisma.employee.findMany({
      where: { accessRole: "KARYAWAN" },
      include: { loginEvents: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    const presence = employees.map((e) => {
      const last = e.loginEvents[0];
      const lat = last?.lat ?? e.homeLat;
      const lng = last?.lng ?? e.homeLng;
      const km = last?.distanceKm ?? 0;
      const inRadius = last?.inRadius ?? false;
      return {
        name: e.name,
        place: last?.place ?? e.homePlace,
        km: `${km} km`,
        time: last ? timeLabel(last.createdAt) : "—",
        coord: `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
        status: inRadius ? "Dalam radius" : "Luar radius",
        lat,
        lng,
      };
    });

    return NextResponse.json({
      hq: { lat: HQ.lat, lng: HQ.lng, label: HQ_NAME },
      radiusKm: ATTENDANCE_RADIUS_KM,
      presence,
    });
  } catch (e) {
    return apiError(e);
  }
}
