/** Parses the "Tanggal Bergabung" form value ("YYYY-MM-DD" or ""). Stored as UTC midnight of that day. */
export function parseJoinedAt(raw: unknown): { ok: true; value: Date | null } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: null };
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(raw)) return { ok: false, error: "Tanggal bergabung tidak valid." };
  const d = new Date(`${raw.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return { ok: false, error: "Tanggal bergabung tidak valid." };
  if (d.getTime() > Date.now() + 24 * 3600 * 1000) return { ok: false, error: "Tanggal bergabung tidak boleh di masa depan." };
  return { ok: true, value: d };
}

/** "17 Okt 2026" — the stored UTC date shown as-is (no timezone shift). */
export function joinedLabel(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}