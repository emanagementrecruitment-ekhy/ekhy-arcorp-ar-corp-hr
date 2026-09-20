import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { monthLabel } from "@/lib/format";

/**
 * Lists archived resign Slip Pay snapshots (see ResignPayslip in
 * schema.prisma and src/lib/payslip-archive.ts). Deliberately gated tighter
 * than every other payslip route — OWNER/CONSULTANT only, not ADMIN_PUSAT —
 * per the "folder terkunci" requirement: a resigned employee's last payroll
 * is sensitive enough that even the office Admin Pusat tier shouldn't see it.
 */
export async function GET() {
  try {
    await requireSession(["OWNER", "CONSULTANT"]);

    const rows = await prisma.resignPayslip.findMany({
      include: { employee: { select: { name: true, code: true, role: true, homePlace: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        month: r.month,
        monthLabel: monthLabel(r.month),
        filename: r.filename,
        createdAt: r.createdAt,
        employee: { ...r.employee, place: r.employee.homePlace },
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}
