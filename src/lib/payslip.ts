import "server-only";
import { prisma } from "./prisma";
import { monthRange } from "./period";
import { dLabel, monthLabel } from "./format";
import { VOUCHER_LABEL, type EmployeeLevel } from "./constants";

export interface PayslipRow {
  no: number;
  id: string | null; // PayslipItem id — deletable manual row when set, null for the computed VCR/Kasbon rows
  date: string | null;
  description: string;
  qty: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface Payslip {
  employee: { name: string; code: string; role: string; level: EmployeeLevel; levelLabel: string };
  month: string;
  monthLabel: string;
  rows: PayslipRow[];
  total: number;
}

/**
 * Builds one employee's monthly Slip Pay ledger. "TOTAL VCR" and "KASBON
 * DISETUJUI" are computed live from Voucher/Kasbon — never stored — so they
 * can't drift from the real numbers even if this month's data changes after
 * the payslip was last viewed. Everything else (fees, penalties, item
 * purchases, corrections, ...) comes from manually-entered PayslipItem rows,
 * since the app has no other record of them.
 */
export async function buildPayslip(employeeId: string, month: string): Promise<Payslip | null> {
  const { start, end } = monthRange(month);
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.accessRole !== "KARYAWAN") return null;

  const [vouchers, kasbonRows, items] = await Promise.all([
    prisma.voucher.findMany({ where: { employeeId, occurredAt: { gte: start, lt: end } } }),
    prisma.kasbon.findMany({ where: { employeeId, status: "DISETUJUI", createdAt: { gte: start, lt: end } } }),
    prisma.payslipItem.findMany({ where: { employeeId, month }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
  ]);

  const vcrTotal = vouchers.reduce((s, v) => s + v.amount, 0);
  const kasbonTotal = kasbonRows.reduce((s, k) => s + k.amount, 0);

  const draft: Array<Omit<PayslipRow, "no" | "balance">> = [];
  if (vcrTotal > 0) {
    draft.push({ id: null, date: null, description: "TOTAL VCR", qty: `${vouchers.length} vcr`, debit: vcrTotal, credit: 0 });
  }
  if (kasbonTotal > 0) {
    draft.push({ id: null, date: null, description: "KASBON DISETUJUI", qty: null, debit: 0, credit: kasbonTotal });
  }
  for (const it of items) {
    draft.push({
      id: it.id,
      date: it.date ? dLabel(it.date) : null,
      description: it.description,
      qty: it.qty,
      debit: it.debit,
      credit: it.credit,
    });
  }

  let balance = 0;
  const rows: PayslipRow[] = draft.map((r, i) => {
    balance += r.debit - r.credit;
    return { ...r, no: i + 1, balance };
  });

  const level = employee.level as EmployeeLevel;
  return {
    employee: { name: employee.name, code: employee.code, role: employee.role, level, levelLabel: VOUCHER_LABEL[level] },
    month,
    monthLabel: monthLabel(month),
    rows,
    total: balance,
  };
}

/** Every "YYYY-MM" this employee has any voucher, kasbon, or manual payslip activity in, newest first, always including the current month. */
export async function listPayslipMonths(employeeId: string): Promise<string[]> {
  const [vouchers, kasbonRows, items] = await Promise.all([
    prisma.voucher.findMany({ where: { employeeId }, select: { occurredAt: true } }),
    prisma.kasbon.findMany({ where: { employeeId, status: "DISETUJUI" }, select: { createdAt: true } }),
    prisma.payslipItem.findMany({ where: { employeeId }, select: { month: true } }),
  ]);

  const toYm = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const now = new Date();
  const months = new Set<string>([toYm(now)]);
  vouchers.forEach((v) => months.add(toYm(v.occurredAt)));
  kasbonRows.forEach((k) => months.add(toYm(k.createdAt)));
  items.forEach((it) => months.add(it.month));

  return Array.from(months).sort().reverse();
}
