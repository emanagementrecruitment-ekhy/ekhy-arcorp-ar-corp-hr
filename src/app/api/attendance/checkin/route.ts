import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { distanceKm } from "@/lib/geo";
import { HQ, ATTENDANCE_RADIUS_KM } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN"]);
    const body = await req.json().catch(() => null);
    let lat = Number(body?.lat);
    let lng = Number(body?.lng);
    let place: string | undefined;

    // Browser geolocation can be denied or unavailable (permissions, non-HTTPS,
    // headless environments). Fall back to the employee's registered field
    // location so the attendance flow still completes instead of dead-ending.
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const employee = await prisma.employee.findUniqueOrThrow({ where: { id: session.employeeId } });
      lat = employee.homeLat;
      lng = employee.homeLng;
      place = employee.homePlace;
    }

    const km = distanceKm(HQ, { lat, lng });
    const inRadius = km <= ATTENDANCE_RADIUS_KM;

    const event = await prisma.loginEvent.create({
      data: { employeeId: session.employeeId, lat, lng, distanceKm: km, inRadius, place },
    });

    return NextResponse.json({
      ok: true,
      lat,
      lng,
      distanceKm: km,
      inRadius,
      radiusKm: ATTENDANCE_RADIUS_KM,
      usedFallbackLocation: place !== undefined,
      at: event.createdAt,
    });
  } catch (e) {
    return apiError(e);
  }
}
