import { NextResponse } from "next/server";
import { EMPLOYEE_NO_PHOTO } from "@/lib/employee-select";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES, HQ, HQ_NAME, ATTENDANCE_RADIUS_KM } from "@/lib/constants";
import { timeLabel } from "@/lib/format";
import { distanceKm } from "@/lib/geo";
import { newestFix } from "@/lib/live-location";

export async function GET() {
  try {
    // Kepala Mess (SUPERVISOR) may see the attendance list but not the map/
    // coordinates — see the `restricted` flag and the lat/lng/coord omission below.
    const session = await requireSession([...OFFICE_ROLES, "SUPERVISOR"]);
    const restricted = session.accessRole === "SUPERVISOR";

    const employees = await prisma.employee.findMany({
      where: { accessRole: "KARYAWAN" },
      select: { ...EMPLOYEE_NO_PHOTO, loginEvents: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    const presence = employees.map((e) => {
      const last = e.loginEvents[0];
      // A periodic ping from the employee app (see /api/attendance/ping) wins
      // over the last login whenever it is newer.
      const useLive = newestFix(last?.createdAt, e.liveAt) === "live" && e.liveLat !== null && e.liveLng !== null;
      const lat = useLive ? (e.liveLat as number) : (last?.lat ?? e.homeLat);
      const lng = useLive ? (e.liveLng as number) : (last?.lng ?? e.homeLng);
      const km = useLive ? distanceKm(HQ, { lat, lng }) : (last?.distanceKm ?? distanceKm(HQ, { lat, lng }));
      const inRadius = useLive ? km <= ATTENDANCE_RADIUS_KM : (last?.inRadius ?? km <= ATTENDANCE_RADIUS_KM);
      return {
        id: e.id,
        code: e.code,
        name: e.name,
        email: e.email,
        phone: e.phone,
        level: e.level,
        customRate: e.customRate,
        salary: e.salary,
        role: e.role,
        supervisorId: e.supervisorId ?? "",
        channelLink: e.channelLink ?? "",
        supervisorNote: e.supervisorNote ?? "",
        nik: e.nik ?? "",
        birthPlace: e.birthPlace,
        birthDate: e.birthDate,
        place: useLive ? "GPS langsung" : (last?.place ?? e.homePlace),
        km: `${km} km`,
        time: last ? timeLabel(last.createdAt) : "—",
        // Raw timestamp so the client can show "X menit/jam lalu" — position
        // only updates on login/absen (a one-shot GPS read), never
        // continuously, so without this a pin from days ago looks identical
        // to a fresh one.
        lastSeenAt: useLive ? e.liveAt : (last?.createdAt ?? null),
        // LoginEvent.place is only set when the check-in fell back to the
        // employee's registered outlet (GPS denied/unavailable) — so this
        // pin is that fixed address, not a real GPS reading, whenever
        // there's no login yet at all OR the last one used that fallback.
        isFallbackLocation: useLive ? false : !last || last.place !== null,
        coord: restricted ? "" : `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
        status: inRadius ? "Dalam radius" : "Luar radius",
        lat: restricted ? 0 : lat,
        lng: restricted ? 0 : lng,
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
