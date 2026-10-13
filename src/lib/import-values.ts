// Small, forgiving readers for the cells people type into import sheets ("Rp 1.500.000", "13/10/2026", "ya").
// Pure functions so the rules are unit tested; used by the kasbon and Rincian Slip Pay importers.

import { monthFromText } from "./attendance-matrix";

/** "1500000", "1.500.000", "Rp 1.500.000,-" → 1500000; empty, zero or unreadable → null. */
export function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
  if (typeof raw !== "string") return null;
  // A trailing ",00" / ",-" is a decimal part in Indonesian number style, not thousands.
  const cleaned = raw.replace(/,\s*(-|\d{1,2})\s*$/, "").replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "2026-10-13", "13/10/2026", "13-10-2026" or an Excel serial number → "2026-10-13"; invalid → null. */
export function parseDateKey(raw: unknown): string | null {
  // pickField() hands cells back as text, so an Excel date arrives as the string "46308".
  if (typeof raw === "string" && /^\d{5}$/.test(raw.trim())) raw = Number(raw.trim());
  let y: number, m: number, d: number;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 20000 && raw < 80000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(raw) * 86_400_000);
    y = date.getUTCFullYear();
    m = date.getUTCMonth() + 1;
    d = date.getUTCDate();
  } else if (typeof raw === "string") {
    const s = raw.trim();
    let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    else if ((match = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
    else return null;
  } else return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "2026-10", "10/2026" or "Oktober 2026" → "2026-10"; null when unreadable. */
export function parseMonthKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  let match = s.match(/^(\d{4})-(\d{1,2})$/);
  if (match) return validMonth(Number(match[1]), Number(match[2]));
  if ((match = s.match(/^(\d{1,2})[/-](\d{4})$/))) return validMonth(Number(match[2]), Number(match[1]));
  const named = monthFromText(s);
  return named ? validMonth(named.year, named.month) : null;
}

function validMonth(year: number, month: number): string | null {
  return month >= 1 && month <= 12 ? `${year}-${String(month).padStart(2, "0")}` : null;
}

export type KasbonImportStatus = "MENUNGGU_OWNER" | "DISETUJUI" | "DITOLAK";

/** Empty means still waiting for the Owner (safest: it moves no money until someone approves it in the app). */
export function parseKasbonStatus(raw: unknown): KasbonImportStatus | null {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!s || /^(menunggu|pending|proses|belum)/.test(s)) return "MENUNGGU_OWNER";
  if (/^(disetujui|setuju|approved|acc|ok)/.test(s)) return "DISETUJUI";
  if (/^(ditolak|tolak|rejected)/.test(s)) return "DITOLAK";
  return null;
}

export function parseYesNo(raw: unknown): boolean {
  return typeof raw === "string" ? /^(ya|y|yes|sudah|true|1|ditransfer|transfer)$/i.test(raw.trim()) : raw === true || raw === 1;
}
