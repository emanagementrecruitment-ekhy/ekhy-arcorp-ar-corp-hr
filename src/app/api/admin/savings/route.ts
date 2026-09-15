import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { parseMonth } from "@/lib/period";
import { buildPayslip } from "@/lib/payslip";

export async function POST(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const body = await req.json().catch(() => null);

    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const month = parseMonth(typeof body?.month === "string" ? body.month : null);
    const dateRaw = typeof body?.date === "string" ? body.date : "";
    const amount = Math.max(0, Math.round(Number(body?.amount) || 0));
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    if (!employeeId) return NextResponse.json({ error: "Pilih karyawan dulu." }, { status: 400 });
    if (!dateRaw) return NextResponse.json({ error: "Tanggal menabung wajib diisi." }, { status: 400 });
    const date = new Date(dateRaw);
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    if (amount <= 0) return NextResponse.json({ error: "Isi nominal Tabungan." }, { status: 400 });

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.accessRole !== "KARYAWAN") {
      return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    }

    await prisma.savingEntry.create({ data: { employeeId, date, amount, note: note || null } });

    const payslip = await buildPayslip(employeeId, month);
    return NextResponse.json({ ok: true, payslip });
  } catch (e) {
    return apiError(e);
  }
}
