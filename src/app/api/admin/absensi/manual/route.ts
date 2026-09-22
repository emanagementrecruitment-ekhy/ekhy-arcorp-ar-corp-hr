import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";

/**
 * Admin-side counterpart to the employee's own self check-in box — for
 * backfilling a day someone forgot to tap, or entering paper-based
 * attendance. Same idempotent create-and-catch-P2002 pattern as
 * markAttendanceToday() in src/lib/attendance.ts, just with an explicit
 * employeeId/dateKey instead of "today, this session's employee". Never
 * runs ensureLateCheckinPenalty — there's no real arrival time to judge
 * lateness from on a backfilled row, so charging one here would be a guess,
 * not a fact.
 */
export async function POST(req: Request) {
  try {
    await requireSession(["OWNER", "CONSULTANT", "MANAGER"]);
    const body = await req.json().catch(() => null);
    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const dateKey = typeof body?.dateKey === "string" ? body.dateKey : "";

    if (!employeeId) return NextResponse.json({ error: "Pilih karyawan/Tera dulu." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (dateKey > today) {
      return NextResponse.json({ error: "Tidak bisa menandai hadir untuk tanggal yang belum terjadi." }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.accessRole !== "KARYAWAN") {
      return NextResponse.json({ error: "Karyawan/Tera tidak ditemukan." }, { status: 404 });
    }
    if (employee.status !== "AKTIF") {
      return NextResponse.json({ error: "Karyawan/Tera ini berstatus Resign." }, { status: 400 });
    }

    try {
      await prisma.attendance.create({ data: { employeeId, dateKey, month: dateKey.slice(0, 7) } });
      return NextResponse.json({ ok: true, alreadyMarked: false });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return NextResponse.json({ ok: true, alreadyMarked: true });
      }
      throw e;
    }
  } catch (e) {
    return apiError(e);
  }
}
