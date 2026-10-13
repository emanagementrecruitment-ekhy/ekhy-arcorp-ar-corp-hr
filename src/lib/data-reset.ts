import "server-only";
import { prisma } from "./prisma";
import { DEMO_TERA_CODE } from "./constants";

export interface DataResetResult {
  employeesRemoved: number;
  seatHoldersKept: number;
}

/**
 * Brings the app back to zero: every Tera/karyawan except the demo Grace is deleted, and ALL transaction data
 * (voucher, kasbon, absensi, chat, slip pay items, tabungan, biaya rutin, arsip resign, notifikasi, pengingat, login)
 * is wiped. Owner/Konsultan accounts, appearance settings, license/package settings and the Riwayat Aktivitas are kept —
 * the log is deliberately append-only, so the reset itself is recorded in it by the caller.
 *
 * Whoever currently holds an Admin Pusat / Kepala Mess / Manager seat is kept (they would lose their login otherwise)
 * unless `removeSeatHolders` is set; their payroll history is wiped either way.
 */
export async function resetAppData(opts: { removeSeatHolders: boolean }): Promise<DataResetResult> {
  const removable = opts.removeSeatHolders ? ["KARYAWAN", "ADMIN_PUSAT", "SUPERVISOR", "MANAGER"] : ["KARYAWAN"];

  const seatHoldersKept = opts.removeSeatHolders
    ? 0
    : await prisma.employee.count({ where: { accessRole: { in: ["ADMIN_PUSAT", "SUPERVISOR", "MANAGER"] } } });

  const results = await prisma.$transaction([
    // Transaction data first (most of it would cascade with the employees, but Grace and the seat holders stay).
    prisma.voucher.deleteMany(),
    prisma.kasbon.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.attendancePenaltyCheck.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.payslipItem.deleteMany(),
    prisma.recurringCost.deleteMany(),
    prisma.savingEntry.deleteMany(),
    prisma.resignPayslip.deleteMany(),
    prisma.reminder.deleteMany(), // recipients cascade
    prisma.notification.deleteMany(),
    prisma.loginEvent.deleteMany(),
    prisma.otpCode.deleteMany(),
    // Clear the self-reference so nobody is left pointing at a removed supervisor.
    prisma.employee.updateMany({ data: { supervisorId: null } }),
    prisma.employee.deleteMany({ where: { accessRole: { in: removable }, code: { not: DEMO_TERA_CODE } } }),
  ]);

  const employeesRemoved = (results[results.length - 1] as { count: number }).count;
  return { employeesRemoved, seatHoldersKept };
}
