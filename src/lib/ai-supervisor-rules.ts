// Pure logic for the Kepala Mess (SUPERVISOR) mode of Angel: attendance of every employee and Tera, nothing else.
// No DB, no network, no AI. The server (ai-assistant.ts) builds the roster from the database for a verified
// SUPERVISOR session and these functions decide what the question is and print the answer. Names never go to an AI.

export interface RosterPerson {
  name: string;
  code: string;
  isTera: boolean;
  checkedInToday: boolean;
  checkedInAt: string | null; // "08.04"
  days: number[]; // day-of-month numbers present this month, ascending
}

export type SupervisorQuery =
  | { kind: "belum" }
  | { kind: "sudah" }
  | { kind: "rekap" }
  | { kind: "orang"; matches: number[] }; // indexes into the roster

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ATTENDANCE_WORD = /\b(absen|absensi|hadir|kehadiran|masuk kerja|masuk)\b/;
// Money topics belong to Admin/Owner: a Kepala Mess may not read them for other people.
export const PAY_WORD = /\b(gaji|slip|payslip|vcr|voucher|kasbon|pinalty|penalti|denda|potongan|penghasilan|pendapatan|omzet|honor|upah|bayaran)\b/;

const NOT_A_NAME = new Set([
  "tera", "absen", "absensi", "hadir", "belum", "sudah", "udah", "siapa", "yang", "hari", "bulan", "semua", "karyawan",
  "masuk", "kerja", "kantor", "admin", "owner", "manager", "kepala", "mess", "angel", "saya", "daftar", "rekap",
]);

function personMatches(n: string, roster: RosterPerson[]): number[] {
  const padded = ` ${n} `;
  const words = new Set(n.split(" "));
  const exact: number[] = [];
  const byFirst: number[] = [];
  roster.forEach((p, i) => {
    const full = normalize(p.name);
    const code = normalize(p.code);
    if ((code && padded.includes(` ${code} `)) || (full && padded.includes(` ${full} `))) {
      exact.push(i);
      return;
    }
    const first = full.split(" ")[0];
    if (first && first.length >= 3 && !NOT_A_NAME.has(first) && words.has(first)) byFirst.push(i);
  });
  return exact.length ? exact : byFirst;
}

/**
 * What a Kepala Mess is asking. Returns null when it is not an attendance question about the team (the caller then
 * uses the normal own-data flow) or when it mixes in a money topic (those stay with Admin/Owner).
 */
export function matchSupervisorQuery(message: string, roster: RosterPerson[]): SupervisorQuery | null {
  const n = normalize(message);
  if (!n || PAY_WORD.test(n)) return null;
  if (!ATTENDANCE_WORD.test(n) && !/\bsiapa (yang )?(belum|sudah|udah|tidak|gak)\b/.test(n)) return null;

  const asksWho = /\bsiapa\b/.test(n);
  const matches = personMatches(n, roster);
  if (matches.length && !asksWho) return { kind: "orang", matches };

  const negative = /\b(belum|tidak|gak|nggak|ga|alpa|bolos)\b/.test(n);
  const done = /\b(sudah|udah)\b/.test(n);
  if (negative && !done) return { kind: "belum" };
  if (done) return { kind: "sudah" };
  if (/\b(rekap|rekapan|semua|seluruh|daftar|kehadiran)\b/.test(n)) return { kind: "rekap" };
  return null;
}

const MAX_LINES = 40;

function label(p: RosterPerson): string {
  return `${p.name} (${p.code}${p.isTera ? ", Tera" : ""})`;
}

function capped(lines: string[]): string {
  if (lines.length <= MAX_LINES) return lines.join("\n");
  return `${lines.slice(0, MAX_LINES).join("\n")}\n…dan ${lines.length - MAX_LINES} lainnya.`;
}

export interface SupervisorContext {
  dateLabel: string; // "2026-11-01"
  monthLabel: string; // "November 2026"
  minDays: number;
}

export function supervisorAnswer(q: SupervisorQuery, roster: RosterPerson[], ctx: SupervisorContext): string {
  if (roster.length === 0) return "Belum ada karyawan atau Tera aktif yang bisa saya tampilkan absensinya.";
  const note = "Kepala Mess hanya bisa melihat absensi; gaji, VCR, dan kasbon hanya untuk Admin/Owner.";

  if (q.kind === "belum") {
    const list = roster.filter((p) => !p.checkedInToday);
    if (list.length === 0) return `Semua ${roster.length} karyawan dan Tera sudah absen hari ini (${ctx.dateLabel}) ✅`;
    return `Belum absen hari ini (${ctx.dateLabel}): ${list.length} dari ${roster.length} orang.\n${capped(list.map((p) => `• ${label(p)}`))}\n\n${note}`;
  }
  if (q.kind === "sudah") {
    const list = roster.filter((p) => p.checkedInToday);
    if (list.length === 0) return `Belum ada yang absen hari ini (${ctx.dateLabel}).`;
    return `Sudah absen hari ini (${ctx.dateLabel}): ${list.length} dari ${roster.length} orang.\n${capped(list.map((p) => `• ${label(p)}${p.checkedInAt ? ` — ${p.checkedInAt}` : ""}`))}`;
  }
  if (q.kind === "rekap") {
    const lines = roster.map((p) => `• ${label(p)}: ${p.days.length} hari${p.days.length < ctx.minDays ? "" : " ✓"}`);
    return `Rekap hari hadir ${ctx.monthLabel} (minimal ${ctx.minDays} hari, ✓ = sudah tercapai):\n${capped(lines)}`;
  }
  // one or more named people
  if (q.matches.length > 3) return "Ada banyak nama yang cocok. Sebut nama lengkap atau kodenya ya.";
  const parts = q.matches.map((i) => {
    const p = roster[i];
    const today = p.checkedInToday ? `sudah absen hari ini${p.checkedInAt ? ` pukul ${p.checkedInAt}` : ""}` : "belum absen hari ini";
    const days = p.days.length ? `Tanggal hadir: ${p.days.join(", ")}.` : "Belum ada hari hadir bulan ini.";
    return `${label(p)}: ${today}.\n${ctx.monthLabel}: ${p.days.length} hari hadir (minimal ${ctx.minDays}). ${days}`;
  });
  return parts.join("\n\n");
}

/** Shown when a Kepala Mess asks about someone else's pay, VCR or kasbon. */
export function supervisorPayRefusal(firstName: string): string {
  return `Maaf ${firstName}, sebagai Kepala Mess kamu bisa menanyakan absensi karyawan dan Tera, tetapi gaji, VCR, dan kasbon orang lain hanya boleh dilihat Admin/Owner. Kalau perlu, tekan "Kirim ke kantor".`;
}

