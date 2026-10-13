// Reads the monthly "LAPORAN ABSENSI/VCR" workbook the office keeps: one sheet per month, one row per terapis,
// one column per calendar day. A NUMBER in a day cell (0 included) means she was present that day — the number
// is that day's VCR count and is deliberately ignored here; a letter (O, M, P, S, I, ".") or an empty cell is not
// attendance. Pure functions, no DB or file access, so the parsing rules are unit tested.

export interface MatrixPerson {
  row: number; // 1-based sheet row, for error messages
  name: string;
  days: number[]; // present days of the month (1-31)
}

export interface MatrixSheet {
  sheet: string;
  year: number;
  month: number; // 1-12
  people: MatrixPerson[];
}

// English and Indonesian spellings, plus the "JUNY" typo used in the real file.
const MONTHS: Record<string, number> = {
  januari: 1, january: 1, jan: 1,
  februari: 2, february: 2, feb: 2,
  maret: 3, march: 3, mar: 3,
  april: 4, apr: 4,
  mei: 5, may: 5,
  juni: 6, juny: 6, june: 6, jun: 6,
  juli: 7, july: 7, jul: 7,
  agustus: 8, august: 8, agu: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, october: 10, okt: 10, oct: 10,
  november: 11, nov: 11,
  desember: 12, december: 12, des: 12, dec: 12,
};

/** "LAPORAN ABSENSI BV JULY 2026" → { year: 2026, month: 7 }; null when either part is missing. */
export function monthFromText(text: string): { year: number; month: number } | null {
  const year = text.match(/\b(20\d{2})\b/);
  if (!year) return null;
  for (const word of text.toLowerCase().split(/[^a-z]+/)) {
    if (MONTHS[word]) return { year: Number(year[1]), month: MONTHS[word] };
  }
  return null;
}

function cellText(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return Number(v.trim());
  return null;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Parses one sheet (rows as arrays, e.g. XLSX sheet_to_json with header:1). Returns null when the sheet is not a
 * monthly attendance matrix (dashboards, guides, flat tables), so the caller can fall back to the plain format.
 */
export function parseMatrixSheet(sheetName: string, rows: unknown[][]): MatrixSheet | null {
  // Header row: a cell reading "NAMA" followed by a run of day numbers 1, 2, 3, ...
  let headerIdx = -1;
  let nameCol = -1;
  let firstDayCol = -1;
  for (let r = 0; r < Math.min(rows.length, 12) && headerIdx < 0; r++) {
    const row = rows[r] ?? [];
    const c = row.findIndex((v) => cellText(v).toLowerCase() === "nama");
    if (c < 0) continue;
    const d = row.findIndex((v, i) => i > c && asNumber(v) === 1);
    if (d < 0) continue;
    headerIdx = r;
    nameCol = c;
    firstDayCol = d;
  }
  if (headerIdx < 0) return null;

  const header = rows[headerIdx];
  const dayCols: { col: number; day: number }[] = [];
  for (let c = firstDayCol, expected = 1; c < header.length; c++, expected++) {
    if (asNumber(header[c]) !== expected) break;
    dayCols.push({ col: c, day: expected });
  }
  // A real month has 28-31 day columns; anything shorter is some other table.
  if (dayCols.length < 28) return null;

  // The month and year live in the sheet title (cell A1) or, failing that, in the sheet name.
  let when: { year: number; month: number } | null = null;
  for (let r = 0; r < headerIdx && !when; r++) for (const v of rows[r] ?? []) if (!when && typeof v === "string") when = monthFromText(v);
  when ??= monthFromText(sheetName);
  if (!when) return null;

  const max = daysInMonth(when.year, when.month);
  const people: MatrixPerson[] = [];
  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const name = cellText(row[nameCol]);
    // Person rows carry a running number in the first column; section rows ("AGENT AA") and the legend do not.
    if (!name || /^agent\b/i.test(name) || asNumber(row[0]) === null) continue;
    const days = dayCols.filter(({ col, day }) => day <= max && asNumber(row[col]) !== null).map(({ day }) => day);
    people.push({ row: r + 1, name, days });
  }
  return { sheet: sheetName, year: when.year, month: when.month, people };
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export type NameMatch<T> = { ok: true; employee: T } | { ok: false; reason: "none" | "ambiguous"; candidates: T[] };

/**
 * The report names terapis by first name ("SHERLY") while the app may hold the full name ("Sherly Amelia"), so a
 * name matches when it equals the full name or is the leading word(s) of it. Exact full-name equality wins; two
 * different people sharing the leading name are reported as ambiguous instead of guessed.
 */
export function matchEmployeeByName<T extends { name: string }>(fileName: string, employees: T[]): NameMatch<T> {
  const n = norm(fileName);
  if (!n) return { ok: false, reason: "none", candidates: [] };
  const exact = employees.filter((e) => norm(e.name) === n);
  if (exact.length === 1) return { ok: true, employee: exact[0] };
  const loose = employees.filter((e) => {
    const en = norm(e.name);
    return en === n || en.startsWith(n + " ") || n.startsWith(en + " ");
  });
  if (loose.length === 1) return { ok: true, employee: loose[0] };
  return { ok: false, reason: loose.length === 0 ? "none" : "ambiguous", candidates: loose };
}
