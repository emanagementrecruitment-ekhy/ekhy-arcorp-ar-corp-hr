import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { monthRange, parseMonth } from "./period";
import { dayKey, monthLabel } from "./format";
import {
  usesVcr,
  ATTENDANCE_CHECKIN_START_MONTH,
  LATE_CHECKIN_DEADLINE_HOUR,
  LATE_CHECKIN_GRACE_MINUTES,
  LATE_CHECKIN_PENALTY_AMOUNT,
  LATE_CHECKIN_PENALTY_CATEGORY,
} from "./constants";

/** Number of calendar days in a "YYYY-MM" month. */
export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function todayKey(): string {
  return dayKey(new Date());
}

/**
 * Self check-in: marks today present for this employee, once. Calling it
 * again the same day is a no-op (idempotent) rather than an error, since the
 * UI re-calls this on every tap of an already-checked box.
 */
export async function markAttendanceToday(employeeId: string): Promise<{ dateKey: string; alreadyMarked: boolean }> {
  const dk = todayKey();
  // Create optimistically and let the employeeId+dateKey unique constraint
  // be the source of truth, rather than check-then-create: a double tap or
  // an auto-retried request racing with itself would otherwise both pass
  // the check before either insert lands, and the loser would crash with a
  // raw constraint-violation 500 instead of the idempotent no-op the UI expects.
  try {
    await prisma.attendance.create({
      data: { employeeId, dateKey: dk, month: dk.slice(0, 7) },
    });
    return { dateKey: dk, alreadyMarked: false };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { dateKey: dk, alreadyMarked: true };
    }
    throw e;
  }
}

/**
 * Books a one-off Pinalty Terlambat Absen deduction on the Slip Pay for the
 * day's `dateKey`, if this employee is non-Tera KARYAWAN and their self
 * check-in for that day landed after the LATE_CHECKIN_* deadline. Idempotent
 * via the atomic updateMany guard below (a retried/duplicated call can never
 * book the same day twice), and a no-op entirely once already evaluated.
 */
export async function ensureLateCheckinPenalty(employeeId: string, dateKey: string): Promise<void> {
  const attendance = await prisma.attendance.findUnique({
    where: { employeeId_dateKey: { employeeId, dateKey } },
  });
  if (!attendance || attendance.latePenaltyApplied) return;

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.accessRole !== "KARYAWAN" || usesVcr(employee.role)) return;

  // Asia/Jakarta (WIB) has no daylight saving, so the deadline is computed
  // directly in UTC (Jakarta hour - 7) rather than trusting the server
  // host's own timezone — see the doc-comment on these constants.
  const [y, m, d] = dateKey.split("-").map(Number);
  const deadlineUtc = Date.UTC(y, m - 1, d, LATE_CHECKIN_DEADLINE_HOUR - 7, LATE_CHECKIN_GRACE_MINUTES, 0, 0);
  if (attendance.createdAt.getTime() <= deadlineUtc) return; // checked in on time

  const { count } = await prisma.attendance.updateMany({
    where: { id: attendance.id, latePenaltyApplied: false },
    data: { latePenaltyApplied: true },
  });
  if (count === 0) return; // a concurrent call already booked this one

  await prisma.payslipItem.create({
    data: {
      employeeId,
      month: attendance.month,
      date: attendance.createdAt,
      description: `Pinalty Terlambat Absen (lewat jam ${LATE_CHECKIN_DEADLINE_HOUR}.${String(LATE_CHECKIN_GRACE_MINUTES).padStart(2, "0")})`,
      category: LATE_CHECKIN_PENALTY_CATEGORY,
      qty: null,
      debit: 0,
      credit: LATE_CHECKIN_PENALTY_AMOUNT,
      note: "Otomatis oleh sistem — bisa diedit atau dihapus Owner.",
    },
  });
}

/** This employee's marked dateKeys ("YYYY-MM-DD") for one month. */
export async function getEmployeeMonthAttendance(employeeId: string, month: string): Promise<Set<string>> {
  const rows = await prisma.attendance.findMany({ where: { employeeId, month }, select: { dateKey: true } });
  return new Set(rows.map((r) => r.dateKey));
}

/**
 * Days actually present this month — the single source of truth for Hari
 * Hadir everywhere (Slip Pay, Pinalty Absensi, Ringkasan Operasional).
 * Returns 0 for any month before the check-in box existed, since an empty
 * Attendance table there means "not tracked yet", not "didn't show up" —
 * see ATTENDANCE_CHECKIN_START_MONTH.
 */
export async function getAttendanceDaysCount(employeeId: string, month: string): Promise<number> {
  if (month < ATTENDANCE_CHECKIN_START_MONTH) return 0;
  return prisma.attendance.count({ where: { employeeId, month } });
}

export interface OutletEmployeeRow {
  id: string;
  name: string;
  code: string;
  role: string;
  isTera: boolean;
  days: boolean[]; // index 0 = day 1
  dayIds: (string | null)[]; // Attendance.id per day, for the delete button — null when not marked
  hariHadir: number;
  persenHadir: number;
}

export interface OutletGroup {
  place: string;
  employees: OutletEmployeeRow[];
}

export interface AttendanceDashboard {
  month: string;
  monthLabel: string;
  daysInMonth: number;
  trackingStarted: boolean; // false when `month` is before ATTENDANCE_CHECKIN_START_MONTH
  // Lets the table mark a genuinely absent (not just "hasn't happened yet")
  // day red — see admin/absensi-harian/page.tsx. todayDay is only set when
  // `month` is the current calendar month; isFutureMonth is true when the
  // whole month is still ahead (both mean "no day in this month is decided
  // yet" from isFutureMonth's side, or "only days before todayDay are").
  todayDay: number | null;
  isFutureMonth: boolean;
  totalRegistered: number;
  totalVcrThisMonth: number;
  avgPercentHadir: number;
  outlets: OutletGroup[];
}

/** Full per-outlet Absensi Harian dashboard for one month — mirrors the reference spreadsheet's DASHBOARD sheet. */
export async function getAttendanceDashboard(monthInput: string | null): Promise<AttendanceDashboard> {
  const month = parseMonth(monthInput);
  const trackingStarted = month >= ATTENDANCE_CHECKIN_START_MONTH;
  const totalDays = daysInMonth(month);
  const { start, end } = monthRange(month);
  const currentMonth = parseMonth(null);
  const todayDay = month === currentMonth ? new Date().getDate() : null;
  const isFutureMonth = month > currentMonth;

  const [employees, attendanceRows, vouchers] = await Promise.all([
    prisma.employee.findMany({
      where: { accessRole: "KARYAWAN" },
      orderBy: [{ homePlace: "asc" }, { name: "asc" }],
    }),
    trackingStarted
      ? prisma.attendance.findMany({ where: { month } })
      : Promise.resolve([]),
    prisma.voucher.findMany({ where: { occurredAt: { gte: start, lt: end } }, select: { amount: true } }),
  ]);

  const byEmployee = new Map<string, { id: string; dateKey: string }[]>();
  for (const a of attendanceRows) {
    const list = byEmployee.get(a.employeeId) ?? [];
    list.push({ id: a.id, dateKey: a.dateKey });
    byEmployee.set(a.employeeId, list);
  }

  const groups = new Map<string, OutletEmployeeRow[]>();
  let percentSum = 0;

  for (const e of employees) {
    const marks = byEmployee.get(e.id) ?? [];
    const byDay = new Map(marks.map((m) => [Number(m.dateKey.slice(8, 10)), m.id]));
    const days: boolean[] = [];
    const dayIds: (string | null)[] = [];
    for (let d = 1; d <= totalDays; d++) {
      const id = byDay.get(d) ?? null;
      days.push(id !== null);
      dayIds.push(id);
    }
    const hariHadir = marks.length;
    const persenHadir = totalDays > 0 ? Math.round((hariHadir / totalDays) * 100) : 0;
    percentSum += persenHadir;

    const row: OutletEmployeeRow = {
      id: e.id,
      name: e.name,
      code: e.code,
      role: e.role,
      isTera: usesVcr(e.role),
      days,
      dayIds,
      hariHadir,
      persenHadir,
    };
    const list = groups.get(e.homePlace) ?? [];
    list.push(row);
    groups.set(e.homePlace, list);
  }

  const outlets: OutletGroup[] = Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([place, emps]) => ({ place, employees: emps }));

  return {
    month,
    monthLabel: monthLabel(month),
    daysInMonth: totalDays,
    trackingStarted,
    todayDay,
    isFutureMonth,
    totalRegistered: employees.length,
    totalVcrThisMonth: vouchers.reduce((s, v) => s + v.amount, 0),
    avgPercentHadir: employees.length > 0 ? Math.round(percentSum / employees.length) : 0,
    outlets,
  };
}
