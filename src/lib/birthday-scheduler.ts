import "server-only";
import { prisma } from "./prisma";
import { notifyOffice } from "./notify";
import { computeAge } from "./birthday";

// Process-local guard so the (otherwise unnecessary) full Employee scan only
// runs once a day even though src/instrumentation.ts polls every 60s — the
// real duplicate-notification guard is Employee.lastBirthdayNotifiedYear
// below, which survives restarts; this is purely to avoid hammering the DB.
let lastCheckedDayKey: string | null = null;

/**
 * Runs on the same interval as processDueReminders (see instrumentation.ts).
 * Posts one office notification ("🎂 Hari ini ulang tahun ...") the first
 * time each active employee's birthDate matches today in a given year —
 * lastBirthdayNotifiedYear stops it firing again on every later restart the
 * same day, or again next month if the date is somehow revisited.
 */
export async function checkBirthdaysToday() {
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (lastCheckedDayKey === dayKey) return;
  lastCheckedDayKey = dayKey;

  const month = now.getMonth();
  const day = now.getDate();
  const year = now.getFullYear();

  const employees = await prisma.employee.findMany({
    where: { status: "AKTIF", birthDate: { not: null } },
    select: { id: true, name: true, role: true, birthDate: true, lastBirthdayNotifiedYear: true },
  });

  for (const e of employees) {
    if (!e.birthDate) continue;
    if (e.birthDate.getMonth() !== month || e.birthDate.getDate() !== day) continue;
    if (e.lastBirthdayNotifiedYear === year) continue;

    const age = computeAge(e.birthDate, now);
    await notifyOffice(`🎂 Hari ini ulang tahun ${e.name} (${e.role}) — genap ${age} tahun.`);
    await prisma.employee.update({ where: { id: e.id }, data: { lastBirthdayNotifiedYear: year } });
  }
}
