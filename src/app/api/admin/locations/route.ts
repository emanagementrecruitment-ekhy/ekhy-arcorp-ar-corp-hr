import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES, HQ, HQ_NAME, ATTENDANCE_RADIUS_KM } from "@/lib/constants";
import { timeLabel, shortRp } from "@/lib/format";
import { distanceKm } from "@/lib/geo";
import { monthRange, parseMonth } from "@/lib/period";

export async function GET() {
  try {
    // Kepala Mess (SUPERVISOR) may see the attendance list but not the map/
    // coordinates — see the `restricted` flag and the lat/lng/coord omission below.
    const session = await requireSession([...OFFICE_ROLES, "SUPERVISOR"]);
    const restricted = session.accessRole === "SUPERVISOR";

    const { start: monthStart, end: monthEnd } = monthRange(parseMonth(null));
    const [employees, monthVouchers] = await Promise.all([
      prisma.employee.findMany({
        where: { accessRole: "KARYAWAN" },
        include: { loginEvents: { orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      prisma.voucher.findMany({
        where: { occurredAt: { gte: monthStart, lt: monthEnd } },
        select: { employeeId: true, amount: true },
      }),
    ]);

    const incomeByEmployee = new Map<string, number>();
    for (const v of monthVouchers) {
      incomeByEmployee.set(v.employeeId, (incomeByEmployee.get(v.employeeId) ?? 0) + v.amount);
    }

    const presence = employees.map((e) => {
      const last = e.loginEvents[0];
      const lat = last?.lat ?? e.homeLat;
      const lng = last?.lng ?? e.homeLng;
      const km = last?.distanceKm ?? distanceKm(HQ, { lat, lng });
      const inRadius = last?.inRadius ?? km <= ATTENDANCE_RADIUS_KM;
      return {
        id: e.id,
        code: e.code,
        name: e.name,
        email: e.email,
        phone: e.phone,
        level: e.level,
        role: e.role,
        supervisorId: e.supervisorId ?? "",
        channelLink: e.channelLink ?? "",
        supervisorNote: e.supervisorNote ?? "",
        place: last?.place ?? e.homePlace,
        km: `${km} km`,
        time: last ? timeLabel(last.createdAt) : "—",
        coord: restricted ? "" : `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
        status: inRadius ? "Dalam radius" : "Luar radius",
        lat: restricted ? 0 : lat,
        lng: restricted ? 0 : lng,
        monthlyIncome: shortRp(incomeByEmployee.get(e.id) ?? 0),
      };
    });

    return NextResponse.json({
      restricted,
      hq: { lat: HQ.lat, lng: HQ.lng, label: HQ_NAME },
      radiusKm: ATTENDANCE_RADIUS_KM,
      presence,
    });
  } catch (e) {
    return apiError(e);
  }
}
