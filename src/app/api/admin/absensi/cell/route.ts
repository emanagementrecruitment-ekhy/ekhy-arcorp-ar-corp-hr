import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { normalizeAttendanceCode } from "@/lib/attendance-codes";

/**
 * Keyboard entry in the Absensi Harian grid: set (or clear) the status code of
 * one employee on one day. Empty code removes the mark. Same roles and same
 * "no future dates" rule as the manual add; never runs the late-check-in
 * penalty (no real arrival time on an admin-entered row).
 */
export async function PUT(req: Request) {
  try {
    await requireSession(["OWNER", "CONSULTANT", "MANAGER"]);
    const body = await req.json().catch(() => null);
    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const dateKey = typeof body?.dateKey === "string" ? body.dateKey : "";
    const code = normalizeAttendanceCode(body?.code);

    if (!employeeId) return NextResponse.json({ error: "Karyawan tidak valid." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    if (code === undefined) return NextResponse.json({ error: "Kode tidak dikenal. Pakai M, O, P, PK, atau S." }, { status: 400 });
    if (dateKey > new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: "Tidak bisa mengisi tanggal yang belum terjadi." }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.accessRole !== "KARYAWAN") return NextResponse.json({ error: "Karyawan/Tera tidak ditemukan." }, { status: 404 });
    if (employee.status !== "AKTIF") return NextResponse.json({ error: "Karyawan/Tera ini berstatus Resign." }, { status: 400 });

    if (code === null) {
      await prisma.attendance.deleteMany({ where: { employeeId, dateKey } });
      return NextResponse.json({ ok: true, code: null });
    }
    await prisma.attendance.upsert({
      where: { employeeId_dateKey: { employeeId, dateKey } },
      create: { employeeId, dateKey, month: dateKey.slice(0, 7), code, manual: true },
      update: { code, manual: true },
    });
    return NextResponse.json({ ok: true, code });
  } catch (e) {
    return apiError(e);
  }
}
