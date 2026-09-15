import "server-only";
import { prisma } from "./prisma";
import { monthRange, parseMonth } from "./period";
import { dLabel, monthLabel, dayKey } from "./format";
import {
  VOUCHER_LABEL,
  usesVcr,
  ATTENDANCE_MIN_DAYS,
  ATTENDANCE_PENALTY_AMOUNT,
  ATTENDANCE_PENALTY_CATEGORY,
  type EmployeeLevel,
} from "./constants";

export interface PayslipRow {
  no: number;
  id: string | null; // PayslipItem id — deletable manual row when set, null for the computed VCR/Kasbon rows
  date: string | null;
  description: string;
  category: string | null;
  qty: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface SavingRow {
  id: string;
  date: string;
  amount: number;
  note: string | null;
}

export interface Payslip {
  employee: { name: string; code: string; role: string; place: string; level: EmployeeLevel | null; levelLabel: string };
  month: string;
  monthLabel: string;
  rows: PayslipRow[];
  total: number;
  savings: SavingRow[];
}

/**
 * Builds one employee's monthly Slip Pay ledger. "TOTAL VCR" (Tera only),
 * "GAJI POKOK" (every other Peran, from their fixed Employee.salary), and
 * "KASBON DISETUJUI" are computed live from Voucher/Employee/Kasbon — never
 * stored — so they can't drift from the real numbers even if this month's
 * data changes after the payslip was last viewed. Everything else (fees,
 * penalties, item purchases, corrections, ...) comes from manually-entered
 * PayslipItem rows, since the app has no other record of them.
 */
export async function buildPayslip(employeeId: string, month: string): Promise<Payslip | null> {
  const { start, end } = monthRange(month);
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.accessRole !== "KARYAWAN") return null;

  const [vouchers, kasbonRows, items, savings] = await Promise.all([
    prisma.voucher.findMany({ where: { employeeId, occurredAt: { gte: start, lt: end } } }),
    prisma.kasbon.findMany({ where: { employeeId, status: "DISETUJUI", createdAt: { gte: start, lt: end } } }),
    prisma.payslipItem.findMany({ where: { employeeId, month }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
    prisma.savingEntry.findMany({ where: { employeeId, date: { gte: start, lt: end } }, orderBy: { date: "asc" } }),
  ]);

  const vcr = usesVcr(employee.role);
  const vcrTotal = vouchers.reduce((s, v) => s + v.amount, 0);
  const kasbonTotal = kasbonRows.reduce((s, k) => s + k.amount, 0);

  const draft: Array<Omit<PayslipRow, "no" | "balance">> = [];
  if (vcr && vcrTotal > 0) {
    draft.push({ id: null, date: null, description: "TOTAL VCR", category: null, qty: `${vouchers.length} vcr`, debit: vcrTotal, credit: 0 });
  }
  if (!vcr && employee.salary && employee.salary > 0) {
    draft.push({ id: null, date: null, description: "GAJI POKOK", category: null, qty: null, debit: employee.salary, credit: 0 });
  }
  if (kasbonTotal > 0) {
    draft.push({ id: null, date: null, description: "KASBON DISETUJUI", category: null, qty: null, debit: 0, credit: kasbonTotal });
  }
  for (const it of items) {
    draft.push({
      id: it.id,
      date: it.date ? dLabel(it.date) : null,
      description: it.description,
      category: it.category,
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

  const level = vcr ? (employee.level as EmployeeLevel) : null;
  return {
    employee: {
      name: employee.name,
      code: employee.code,
      role: employee.role,
      place: employee.homePlace,
      level,
      levelLabel: level ? VOUCHER_LABEL[level] : "GAJI",
    },
    month,
    monthLabel: monthLabel(month),
    rows,
    total: balance,
    savings: savings.map((s) => ({ id: s.id, date: dLabel(s.date), amount: s.amount, note: s.note })),
  };
}

/**
 * Auto-creates a Pinalty Absensi row the first time anyone opens a Tera's
 * Slip Pay for a month that has already ended with fewer than
 * ATTENDANCE_MIN_DAYS worked. Runs at most once per employee+month — the
 * AttendancePenaltyCheck row marks the month as decided regardless of
 * whether a penalty was actually warranted, or whether Owner later edits or
 * deletes the row it created, so this never fights back against that
 * decision on a later visit.
 */
export async function ensureAttendancePenalty(employeeId: string, month: string): Promise<void> {
  if (month >= parseMonth(null)) return; // only evaluate months that have fully ended

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || !usesVcr(employee.role)) return;
  const joinedYm = `${employee.createdAt.getFullYear()}-${String(employee.createdAt.getMonth() + 1).padStart(2, "0")}`;
  if (month < joinedYm) return; // wasn't employed yet that month

  const already = await prisma.attendancePenaltyCheck.findUnique({
    where: { employeeId_month: { employeeId, month } },
  });
  if (already) return;

  const { start, end } = monthRange(month);
  const logins = await prisma.loginEvent.findMany({
    where: { employeeId, createdAt: { gte: start, lt: end } },
    select: { createdAt: true },
  });
  const daysPresent = new Set(logins.map((l) => dayKey(l.createdAt))).size;

  if (daysPresent < ATTENDANCE_MIN_DAYS) {
    await prisma.payslipItem.create({
      data: {
        employeeId,
        month,
        date: null,
        description: `Pinalty Absensi (kerja ${daysPresent}/${ATTENDANCE_MIN_DAYS} hari)`,
        category: ATTENDANCE_PENALTY_CATEGORY,
        qty: null,
        debit: 0,
        credit: ATTENDANCE_PENALTY_AMOUNT,
        note: "Otomatis oleh sistem — bisa diedit atau dihapus Owner/Consultant.",
      },
    });
  }

  // Recorded either way, so a month with enough days present is also never re-checked.
  await prisma.attendancePenaltyCheck.create({ data: { employeeId, month } });
}

const PAYSLIP_MONTH_WINDOW = 5;

/**
 * The current month plus up to 4 before it, newest first — capped so an
 * employee/Tera can never browse back past the calendar month they were
 * registered in, even though the window would otherwise reach further.
 */
export async function listPayslipMonths(employeeId: string): Promise<string[]> {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, select: { createdAt: true } });
  const toYm = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const now = new Date();
  const joinedYm = employee ? toYm(employee.createdAt) : toYm(now);

  const months: string[] = [];
  for (let i = 0; i < PAYSLIP_MONTH_WINDOW; i++) {
    const ym = toYm(new Date(now.getFullYear(), now.getMonth() - i, 1));
    if (ym < joinedYm) break;
    months.push(ym);
  }
  return months;
}
