import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { EMPLOYEE_LEVELS, VOUCHER_LABEL, type EmployeeLevel } from "@/lib/constants";
import { fmtRp, dLabel, timeLabel } from "@/lib/format";

const MANAGERS = ["OWNER", "CONSULTANT", "ADMIN_PUSAT"] as const;

export async function GET() {
  try {
    await requireSession([...MANAGERS]);
    const vouchers = await prisma.voucher.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { employee: { select: { name: true, code: true } } },
    });
    return NextResponse.json({
      vouchers: vouchers.map((v) => ({
        id: v.id,
        employeeName: v.employee.name,
        employeeCode: v.employee.code,
        category: VOUCHER_LABEL[v.category as EmployeeLevel] ?? v.category,
        client: v.client,
        amount: fmtRp(v.amount),
        occurredAt: `${dLabel(v.occurredAt)} · ${timeLabel(v.createdAt)}`,
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireSession([...MANAGERS]);
    const body = await req.json().catch(() => null);

    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const category = body?.category as EmployeeLevel;
    const client = typeof body?.client === "string" ? body.client.trim() : "";
    const occurredAtRaw = typeof body?.occurredAt === "string" ? body.occurredAt : "";
    const amount = Number(body?.amount);

    if (!employeeId) return NextResponse.json({ error: "Pilih karyawan dulu." }, { status: 400 });
    if (!EMPLOYEE_LEVELS.includes(category)) return NextResponse.json({ error: "Level tidak valid." }, { status: 400 });
    if (!client) return NextResponse.json({ error: "Nama klien wajib diisi." }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Nominal tidak valid." }, { status: 400 });

    const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();
    if (Number.isNaN(occurredAt.getTime())) return NextResponse.json({ error: "Tanggal tidak valid." }, { status: 400 });

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.accessRole !== "KARYAWAN") {
      return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    }

    const voucher = await prisma.voucher.create({
      data: { employeeId, category, client, amount, occurredAt },
    });

    return NextResponse.json({ ok: true, id: voucher.id });
  } catch (e) {
    return apiError(e);
  }
}
