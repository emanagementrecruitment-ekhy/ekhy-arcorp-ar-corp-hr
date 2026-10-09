import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES, HQ, ATTENDANCE_RADIUS_KM } from "@/lib/constants";
import { distanceKm } from "@/lib/geo";
import { newestFix } from "@/lib/live-location";

/**
 * Lightweight "N aktif" badge for the page header. It used to call the full
 * /api/admin/overview (every employee, 30 days of vouchers, all attendance...)
 * on every admin page just to read one number. Same rule as the overview:
 * in-radius by the newest of last login / live ping.
 */
export async function GET() {
  try {
    await requireSession(OFFICE_ROLES);

    const [employees, logins] = await Promise.all([
      prisma.employee.findMany({
        where: { accessRole: "KARYAWAN" },
        select: { id: true, liveAt: true, liveLat: true, liveLng: true },
      }),
      prisma.loginEvent.findMany({
        select: { employeeId: true, createdAt: true, inRadius: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

    // Newest login per employee (the list is already newest-first).
    const loginByEmployee = new Map<string, (typeof logins)[number]>();
    for (const l of logins) if (!loginByEmployee.has(l.employeeId)) loginByEmployee.set(l.employeeId, l);

    const onlineCount = employees.filter((e) => {
      const login = loginByEmployee.get(e.id);
      if (newestFix(login?.createdAt, e.liveAt) === "live" && e.liveLat !== null && e.liveLng !== null) {
        return distanceKm(HQ, { lat: e.liveLat, lng: e.liveLng }) <= ATTENDANCE_RADIUS_KM;
      }
      return login?.inRadius ?? false;
    }).length;

    return NextResponse.json({ onlineCount });
  } catch (e) {
    return apiError(e);
  }
}
