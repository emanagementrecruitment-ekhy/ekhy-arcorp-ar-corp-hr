import type { Period } from "./period";

/** Days each report period covers — matches periodStart() in period.ts (today / last 7 days / last 30 days). */
export const PERIOD_DAYS: Record<Period, number> = { harian: 1, mingguan: 7, bulanan: 30 };

/** A fixed monthly Gaji counts as 30 days of pay, so a day is 1/30 of it and a week 7/30. */
export const PAY_MONTH_DAYS = 30;

/** Part of a monthly Gaji that belongs to one report period, in whole rupiah. */
export function salaryForPeriod(monthlySalary: number | null | undefined, period: Period): number {
  if (!monthlySalary || monthlySalary < 0) return 0;
  return Math.round((monthlySalary * PERIOD_DAYS[period]) / PAY_MONTH_DAYS);
}
