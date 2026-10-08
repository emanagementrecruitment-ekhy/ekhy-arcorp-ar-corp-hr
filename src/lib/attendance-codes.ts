/**
 * Status codes an admin can type into a cell of the Absensi Harian grid.
 * Each code has a fixed colour; "manual" (no code) is orange.
 * `label` is the legend text — edit it here if the meaning of a letter changes.
 */
export const ATTENDANCE_CODES = {
  M: { label: "M", tone: "red" },
  O: { label: "O", tone: "yellow" },
  P: { label: "P", tone: "green" },
  PK: { label: "PK", tone: "green" },
  S: { label: "S", tone: "blue" },
} as const;

export type AttendanceCode = keyof typeof ATTENDANCE_CODES;
export type AttendanceTone = (typeof ATTENDANCE_CODES)[AttendanceCode]["tone"] | "orange";

/** Tailwind classes per tone (cell fill + border). */
export const TONE_CLASS: Record<AttendanceTone, string> = {
  red: "bg-[#e2716b] border-[#e2716b] text-[#2a0c0a]",
  yellow: "bg-[#eacb4d] border-[#eacb4d] text-[#2b2305]",
  green: "bg-[#7fd1a8] border-[#7fd1a8] text-[#0b2a1a]",
  blue: "bg-[#6aa7e8] border-[#6aa7e8] text-[#081d36]",
  orange: "bg-[#f0a04b] border-[#f0a04b] text-[#2e1a05]",
};

/** Normalises what an admin typed: trims, upper-cases. "" → null (clear). Unknown → undefined. */
export function normalizeAttendanceCode(input: unknown): AttendanceCode | null | undefined {
  if (input === null || input === undefined) return null;
  if (typeof input !== "string") return undefined;
  const v = input.trim().toUpperCase();
  if (v === "") return null;
  return Object.prototype.hasOwnProperty.call(ATTENDANCE_CODES, v) ? (v as AttendanceCode) : undefined;
}

/** Colour tone for a day mark: typed code wins, then orange for admin-entered, else null (plain check-in). */
export function toneForMark(code: string | null, manual: boolean): AttendanceTone | null {
  if (code && Object.prototype.hasOwnProperty.call(ATTENDANCE_CODES, code)) {
    return ATTENDANCE_CODES[code as AttendanceCode].tone;
  }
  return manual ? "orange" : null;
}
