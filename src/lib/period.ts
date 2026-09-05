export type Period = "harian" | "mingguan" | "bulanan";

export const PERIOD_LABEL: Record<Period, string> = {
  harian: "Harian",
  mingguan: "Mingguan",
  bulanan: "Bulanan",
};

export function parsePeriod(v: string | null): Period {
  return v === "mingguan" || v === "bulanan" ? v : "harian";
}

export function periodStart(now: Date, period: Period): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === "mingguan") d.setDate(d.getDate() - 6);
  if (period === "bulanan") d.setDate(d.getDate() - 29);
  return d;
}
