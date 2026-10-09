import "server-only";
import { EMPLOYEE_NO_PHOTO } from "@/lib/employee-select";
import { prisma } from "@/lib/prisma";
import { VCR_ROLE, employeeRate, type EmployeeLevel } from "@/lib/constants";
import { periodStart, PERIOD_LABEL, type Period } from "@/lib/period";
import { salaryForPeriod } from "@/lib/report-calc";

/**
 * Operational totals for one report period, split into Terapis (paid by voucher) and Karyawan
 * (paid a fixed monthly Gaji). Numbers stay raw rupiah here; the page and the CSV format them.
 */
export async function buildOperationalReport(period: Period, now = new Date()) {
  const start = periodStart(now, period);

  const [teraList, staffList] = await Promise.all([
    prisma.employee.findMany({
      where: { accessRole: "KARYAWAN", role: VCR_ROLE },
      select: {
        ...EMPLOYEE_NO_PHOTO,
        vouchers: { where: { occurredAt: { gte: start } } },
        kasbonRequests: { where: { status: "DISETUJUI", createdAt: { gte: start } } },
      },
      orderBy: { code: "asc" },
    }),
    prisma.employee.findMany({
      where: { accessRole: "KARYAWAN", role: { not: VCR_ROLE }, status: "AKTIF" },
      select: {
        ...EMPLOYEE_NO_PHOTO,
        kasbonRequests: { where: { status: "DISETUJUI", createdAt: { gte: start } } },
      },
      orderBy: { code: "asc" },
    }),
  ]);

  const tera = teraList.map((e) => {
    const level = e.level as EmployeeLevel;
    const gross = e.vouchers.reduce((s, v) => s + v.amount, 0);
    const kasbon = e.kasbonRequests.reduce((s, k) => s + k.amount, 0);
    return {
      code: e.code,
      name: e.name,
      level,
      voucherCount: e.vouchers.length,
      rate: employeeRate(level, e.customRate),
      gross,
      kasbon,
      net: gross - kasbon,
    };
  });

  const staff = staffList.map((e) => {
    const pay = salaryForPeriod(e.salary, period);
    const kasbon = e.kasbonRequests.reduce((s, k) => s + k.amount, 0);
    return {
      code: e.code,
      name: e.name,
      role: e.role,
      monthlySalary: e.salary ?? 0,
      pay,
      kasbon,
      net: pay - kasbon,
    };
  });

  const sum = <T,>(rows: T[], pick: (r: T) => number) => rows.reduce((s, r) => s + pick(r), 0);
  const teraGross = sum(tera, (r) => r.gross);
  const staffPay = sum(staff, (r) => r.pay);

  return {
    period,
    periodLabel: PERIOD_LABEL[period],
    start,
    tera,
    staff,
    totals: {
      teraVoucherCount: sum(tera, (r) => r.voucherCount),
      teraGross,
      teraKasbon: sum(tera, (r) => r.kasbon),
      teraNet: sum(tera, (r) => r.net),
      staffPay,
      staffKasbon: sum(staff, (r) => r.kasbon),
      staffNet: sum(staff, (r) => r.net),
      // What the company pays out for people in this period, before kasbon is netted off.
      payroll: teraGross + staffPay,
    },
  };
}
