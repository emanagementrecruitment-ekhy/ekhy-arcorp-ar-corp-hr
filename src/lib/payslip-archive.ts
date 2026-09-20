import "server-only";
import { prisma } from "./prisma";
import { buildPayslip, ensureAttendancePenalty, ensureRecurringCosts } from "./payslip";
import { generatePayslipPdf, payslipFilename } from "./payslip-pdf";
import { parseMonth } from "./period";

/**
 * Freezes an employee/Tera's Slip Pay for one month into ResignPayslip —
 * called the moment they're marked RESIGN (see
 * PATCH /api/admin/employees/[id]/status) so the payroll they were owed
 * can't silently drift or disappear if their Voucher/Kasbon/PayslipItem rows
 * are edited or cleaned up later. Upserted so re-resigning within the same
 * month (e.g. reactivated, then resigned again) always refreshes to the
 * latest numbers instead of keeping a stale snapshot.
 */
export async function archiveResignPayslip(employeeId: string, month?: string): Promise<void> {
  const m = parseMonth(month ?? null);
  await ensureAttendancePenalty(employeeId, m);
  await ensureRecurringCosts(employeeId, m);
  const payslip = await buildPayslip(employeeId, m);
  if (!payslip) return;

  const pdf = await generatePayslipPdf(payslip);
  const filename = payslipFilename(payslip);

  await prisma.resignPayslip.upsert({
    where: { employeeId_month: { employeeId, month: m } },
    update: { filename, pdfData: pdf },
    create: { employeeId, month: m, filename, pdfData: pdf },
  });
}
