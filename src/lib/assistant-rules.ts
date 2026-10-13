// Pure rules for the Asisten Harian (no DB, no clock of its own) so they can be unit tested.
// Everything is expressed in Asia/Jakarta (WIB, fixed UTC+7, no daylight saving), independent of the host's timezone.

const WIB_OFFSET_MIN = 7 * 60;

export interface JakartaClock {
  dateKey: string; // "YYYY-MM-DD" in WIB
  minutes: number; // minutes since 00:00 WIB
  dayStartUtc: Date; // 00:00 WIB of that day, as an instant
}

export function jakartaClock(now: Date): JakartaClock {
  const shifted = new Date(now.getTime() + WIB_OFFSET_MIN * 60_000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  const dateKey = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return {
    dateKey,
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    dayStartUtc: new Date(Date.UTC(y, m, d) - WIB_OFFSET_MIN * 60_000),
  };
}

export function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}.${String(minutes % 60).padStart(2, "0")}`;
}

export type AssistantTaskId = "checkin_1" | "checkin_2" | "checkin_report" | "vcr_reminder" | "vcr_report";

export interface AssistantTask {
  id: AssistantTaskId;
  label: string;
  at: number; // earliest minute (WIB) it may run
  until: number; // latest minute it may still run (a restart in between catches up, later it is skipped)
  /** Who the task is about, shown on the dashboard. */
  audience: "karyawan" | "tera" | "kantor";
}

/** The day's automatic schedule. Edit the times here. */
export const ASSISTANT_TASKS: readonly AssistantTask[] = [
  { id: "checkin_1", label: "Pengingat absen pagi", at: 8 * 60, until: 11 * 60, audience: "karyawan" },
  { id: "checkin_2", label: "Pengingat terakhir sebelum batas absen", at: 11 * 60 + 15, until: 12 * 60 + 10, audience: "karyawan" },
  { id: "checkin_report", label: "Laporan yang belum absen ke kantor", at: 12 * 60 + 30, until: 15 * 60, audience: "kantor" },
  { id: "vcr_reminder", label: "Pengingat input VCR", at: 19 * 60 + 30, until: 21 * 60 + 30, audience: "tera" },
  { id: "vcr_report", label: "Cek total VCR hari ini", at: 21 * 60, until: 23 * 60 + 30, audience: "kantor" },
];

/** Tasks whose time has come and that have not run yet today. */
export function tasksDue(minutes: number, done: ReadonlySet<string>): AssistantTask[] {
  return ASSISTANT_TASKS.filter((t) => minutes >= t.at && minutes <= t.until && !done.has(t.id));
}

export type TaskState = "selesai" | "menunggu" | "terlewat";

/** Dashboard status of one scheduled task right now. */
export function taskState(task: AssistantTask, minutes: number, ran: boolean): TaskState {
  if (ran) return "selesai";
  return minutes > task.until ? "terlewat" : "menunggu";
}

// ---- VCR checks ----

export interface VcrFlagInput {
  todayCount: number; // vouchers recorded today
  avgCount: number; // average vouchers per day over the previous 7 days
  perTera: { name: string; today: number; avg: number }[];
}

/** Anything the office should look at, in plain Indonesian. Empty when the day looks normal. */
export function vcrFlags(input: VcrFlagInput): string[] {
  const flags: string[] = [];
  if (input.avgCount >= 5 && input.todayCount < input.avgCount * 0.5) {
    flags.push(
      `Total VCR hari ini ${input.todayCount} voucher, kurang dari separuh rata-rata 7 hari terakhir (${Math.round(input.avgCount)}).`,
    );
  }
  for (const t of input.perTera) {
    if (t.avg > 0 && t.today >= 5 && t.today >= t.avg * 3) {
      flags.push(`${t.name}: ${t.today} voucher hari ini, jauh di atas biasanya (${Math.round(t.avg)}) — cek apakah salah ketik.`);
    }
  }
  return flags;
}

export function listNames(names: string[], max = 8): string {
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} dan ${names.length - max} lainnya`;
}
