// No "server-only" here — computeAge() is used by client components
// (EmployeeFields, EmployeeListPage) as well as the server-side notifier
// (see birthday-scheduler.ts).

/** Age is always computed live from birthDate, never stored — it changes every year. */
export function computeAge(birthDate: Date | string, at: Date = new Date()): number {
  const b = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  let age = at.getFullYear() - b.getFullYear();
  const hadBirthdayThisYear = at.getMonth() > b.getMonth() || (at.getMonth() === b.getMonth() && at.getDate() >= b.getDate());
  if (!hadBirthdayThisYear) age--;
  return age;
}

/** "MM-DD" key, month/day only — used to match a birthDate against any year (calendar recurs yearly). */
export function monthDayKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Shared by the create/edit employee API routes — "" or missing means "not set", not an error. */
export function parseBirthDate(raw: unknown): { ok: true; value: Date | null } | { ok: false; error: string } {
  if (typeof raw !== "string" || !raw.trim()) return { ok: true, value: null };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { ok: false, error: "Tanggal lahir tidak valid." };
  if (d.getTime() > Date.now()) return { ok: false, error: "Tanggal lahir tidak boleh di masa depan." };
  return { ok: true, value: d };
}
