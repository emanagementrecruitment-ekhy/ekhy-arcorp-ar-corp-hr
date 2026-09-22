import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { EMPLOYEE_STATUSES, type EmployeeStatus } from "@/lib/constants";
import { archiveResignPayslip } from "@/lib/payslip-archive";

/**
 * Toggles an employee/Tera between AKTIF and RESIGN — the non-destructive
 * alternative to DELETE /api/admin/employees/[id]: a resigned account can no
 * longer log in (see findEmployeeForPortal) and drops off the active Data
 * Karyawan/Data Tera list, but every past voucher/absensi/slip pay record
 * stays intact for reports. Reversible, unlike a hard delete.
 *
 * Marking RESIGN also freezes that month's Slip Pay into ResignPayslip (see
 * src/lib/payslip-archive.ts) — the last payroll they were owed, kept in a
 * locked archive only Owner/Consultant can open (see
 * src/app/api/admin/resign-payslip/*), independent of whatever happens to
 * their live voucher/kasbon data afterward.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["OWNER", "CONSULTANT", "MANAGER"]);
    const { id } = await params;
    const body = await req.json().catch(() => null);

    const status = body?.status as EmployeeStatus;
    if (!EMPLOYEE_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
    }

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing || existing.accessRole !== "KARYAWAN") {
      return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    }

    await prisma.employee.update({ where: { id }, data: { status } });

    if (status === "RESIGN") {
      await archiveResignPayslip(id).catch((e) => console.error("[employee-status] archiveResignPayslip failed:", e));
    }

    return NextResponse.json({ ok: true, code: existing.code, status });
  } catch (e) {
    return apiError(e);
  }
}
