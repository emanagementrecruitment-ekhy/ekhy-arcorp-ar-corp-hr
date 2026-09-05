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

export function csvCell(value: unknown): string {
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}

export function toCsv(rows: unknown[][]): string {
  return "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
