import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { parsePing, shouldAcceptPing } from "@/lib/live-location";

// Periodic location ping from the employee app while it is open. Stored on the
// employee row (not as a LoginEvent) so it never clutters the login history or
// the "Notifikasi login karyawan" feed. Coordinates are never sent back.
export async function POST(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN", "SUPERVISOR"]);
    const ping = parsePing(await req.json().catch(() => null));
    if (!ping) return NextResponse.json({ error: "Lokasi tidak valid" }, { status: 400 });

    const me = await prisma.employee.findUniqueOrThrow({
      where: { id: session.employeeId },
      select: { liveAt: true },
    });
    const now = new Date();
    if (!shouldAcceptPing(me.liveAt, now)) return NextResponse.json({ ok: true, stored: false });

    await prisma.employee.update({
      where: { id: session.employeeId },
      data: { liveLat: ping.lat, liveLng: ping.lng, liveAt: now },
    });
    return NextResponse.json({ ok: true, stored: true });
  } catch (e) {
    return apiError(e);
  }
}
