export function fmtRp(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export function shortRp(n: number): string {
  if (n >= 1e9) return "Rp " + (n / 1e9).toFixed(1).replace(".", ",") + " M";
  if (n >= 1e6) return "Rp " + (n / 1e6).toFixed(1).replace(".", ",") + " jt";
  if (n >= 1e3) return "Rp " + Math.round(n / 1e3) + "rb";
  return fmtRp(n);
}

const DAYNAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const FULL_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "2026-04" -> "April 2026". Falls back to the raw string if malformed. */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return ym;
  return `${FULL_MONTHS[m - 1]} ${y}`;
}

export function dLabel(d: Date): string {
  return d.getDate() + " " + MONTHS[d.getMonth()];
}

export function dayLabel(d: Date): string {
  return DAYNAMES[d.getDay()] + ", " + dLabel(d);
}

export function dayKey(d: Date): string {
  return (
    d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function timeLabel(d: Date): string {
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/**
 * "5 menit lalu" / "2 jam lalu" / "3 hari lalu" — used wherever a GPS pin's
 * age needs to be obvious (Lokasi & Absensi position updates once per
 * login/absen, not continuously, so without this a stale pin from days ago
 * looks identical to a fresh one).
 */
export function relativeTimeLabel(iso: string | Date | null): string {
  if (!iso) return "belum pernah absen";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export function isLink(value: string): boolean {
  return /^(https?:\/\/|wa\.me\/|www\.)/i.test(value.trim());
}

export function csvCell(value: unknown): string {
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}

export function toCsv(rows: unknown[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
