import { SD_CATEGORIES } from "./constants";

export type VoucherLine = { category: "FL" | "CLASSIC_D" | null; qty: number };
export type VoucherEntry = { ok: true; lines: VoucherLine[] } | { ok: false; error: string };

const SD_MAX = 200;

/**
 * Parses a self-service voucher entry. Travel / Classic T5 Tera enter S and D
 * separately (matching their Slip Pay); everyone else enters a single count at
 * their own level (category null = use the employee's level).
 */
export function parseVoucherEntry(sd: boolean, body: unknown): VoucherEntry {
  const b = (body ?? {}) as Record<string, unknown>;
  if (!sd) {
    const qty = Math.round(Number(b.qty));
    if (!Number.isInteger(qty) || qty <= 0) return { ok: false, error: "Jumlah VCR tidak valid." };
    return { ok: true, lines: [{ category: null, qty }] };
  }
  const lines: VoucherLine[] = [];
  for (const c of SD_CATEGORIES) {
    const raw = b[c.key === "FL" ? "qtyS" : "qtyD"];
    const qty = raw === undefined || raw === "" ? 0 : Math.round(Number(raw));
    if (!Number.isInteger(qty) || qty < 0 || qty > SD_MAX) return { ok: false, error: `Jumlah VCR ${c.label} tidak valid.` };
    if (qty > 0) lines.push({ category: c.key, qty });
  }
  if (lines.length === 0) return { ok: false, error: "Isi jumlah VCR S atau D." };
  return { ok: true, lines };
}
