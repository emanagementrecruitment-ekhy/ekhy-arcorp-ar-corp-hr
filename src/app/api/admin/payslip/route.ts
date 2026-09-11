import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { parseMonth } from "@/lib/period";
import { buildPayslip } from "@/lib/payslip";

export async function GET(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId") ?? "";
    const month = parseMonth(searchParams.get("month"));

    if (!employeeId) return NextResponse.json({ error: "Pilih karyawan dulu." }, { status: 400 });

    const payslip = await buildPayslip(employeeId, month);
    if (!payslip) return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });

    return NextResponse.json(payslip);
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const body = await req.json().catch(() => null);

    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const month = parseMonth(typeof body?.month === "string" ? body.month : null);
    const dateRaw = typeof body?.date === "string" ? body.date : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const qty = typeof body?.qty === "string" ? body.qty.trim() : "";
    const debit = Math.max(0, Math.round(Number(body?.debit) || 0));
    const credit = Math.max(0, Math.round(Number(body?.credit) || 0));
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    if (!employeeId) return NextResponse.json({ error: "Pilih karyawan dulu." }, { status: 400 });
    if (!description) return NextResponse.json({ error: "Rincian wajib diisi." }, { status: 400 });
    if (debit <= 0 && credit <= 0) {
      return NextResponse.json({ error: "Isi nominal Debit atau Kredit." }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.accessRole !== "KARYAWAN") {
      return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    }

    let date: Date | null = null;
    if (dateRaw) {
      date = new Date(dateRaw);
      if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });
    }

    await prisma.payslipItem.create({
      data: { employeeId, month, date, description, qty: qty || null, debit, credit, note: note || null },
    });

    const payslip = await buildPayslip(employeeId, month);
    return NextResponse.json({ ok: true, payslip });
  } catch (e) {
    return apiError(e);
  }
}
