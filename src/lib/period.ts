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

/** Validates a "YYYY-MM" string, defaulting to the current calendar month. */
export function parseMonth(v: string | null): string {
  if (v && /^\d{4}-\d{2}$/.test(v)) {
    const m = Number(v.slice(5));
    if (m >= 1 && m <= 12) return v;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** [start, end) covering the calendar month named by a "YYYY-MM" string. */
export function monthRange(ym: string): { start: Date; end: Date } {
  const [y, m] = ym.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1) };
}
