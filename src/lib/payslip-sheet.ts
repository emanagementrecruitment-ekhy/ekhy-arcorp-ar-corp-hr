// Pure layout of one Slip Pay in the Excel "Rincian Payroll" format (see the
// owner's PAY SLIP sheet): top fixed rows (TOTAL VCR / GAJI, ADMIN, MESS, ...),
// then four blocks — KASBON UANG, AMBIL BARANG, TAMBAHAN DOKTER, POTONGAN LAIN —
// each with a fixed number of lines, followed by the running "Jumlah Totalan".
// No DB access here so it can be unit tested; payslip.ts feeds it live data.

export type SheetSection = "VCR" | "GAJI" | "EXTRA" | "FIXED" | "KASBON" | "BARANG" | "DOKTER" | "POTONGAN";

export interface SheetItemIn {
  id: string | null; // PayslipItem id — editable/deletable when set, null for computed rows (VCR, kasbon)
  date: string | null; // display label
  dateRaw: string | null;
  description: string;
  category: string | null;
  qty: string | null;
  debit: number;
  credit: number;
  note: string | null;
}

export interface SheetInput {
  vcr: { count: number; total: number; unit: number | null } | null;
  salary: number | null; // fixed monthly Gaji for non-Tera
  kasbon: SheetItemIn[]; // approved kasbon of the month, one entry each
  items: SheetItemIn[]; // manual/recurring PayslipItem rows
}

export interface SheetRow {
  key: string;
  no: number;
  id: string | null;
  section: SheetSection;
  date: string | null;
  dateRaw: string | null;
  blockLabel: string | null; // text of the merged left cell, set on the first row of a block only
  blockSpan: number; // rows the left cell spans (1 for top rows)
  description: string; // item name ("" for blank filler lines)
  qty: string | null;
  debitUnit: number | null;
  debitTotal: number | null;
  creditUnit: number | null; // block lines: the item amount
  creditTotal: number | null; // top rows: the amount; block: block sum on the first row only
  balance: number;
  note: string | null;
  filler: boolean;
}

export const FIXED_LABELS = ["ADMIN", "MESS", "PINALTY ABSEN", "TEST RUTIN", "SPEKULO", "LOKER", "SALON"] as const;
export const BLOCKS: Array<{ section: Exclude<SheetSection, "VCR" | "GAJI" | "EXTRA" | "FIXED">; label: string; min: number }> = [
  { section: "KASBON", label: "KASBON UANG", min: 5 },
  { section: "BARANG", label: "AMBIL BARANG", min: 18 },
  { section: "DOKTER", label: "TAMBAHAN DOKTER", min: 5 },
  { section: "POTONGAN", label: "POTONGAN LAIN", min: 13 },
];

/** Block categories offered in the manual form's "Blok" select. */
export const SHEET_BLOCK_CATEGORIES = ["Kasbon Uang", "Ambil Barang", "Tambahan Dokter", "Potongan Lain"] as const;

type Placement = { section: SheetSection; fixed?: (typeof FIXED_LABELS)[number] };

/** Decides where one stored PayslipItem lands on the sheet, by its category first, then its text. */
export function classifyItem(it: Pick<SheetItemIn, "category" | "description" | "debit" | "credit">): Placement {
  const cat = (it.category ?? "").toLowerCase();
  const text = `${cat} ${it.description.toLowerCase()}`;
  if (cat.includes("kasbon") || (!cat && /\bkasbon\b/.test(text))) return { section: "KASBON" };
  if (cat.includes("barang") || (!cat && /\bbarang\b/.test(text))) return { section: "BARANG" };
  if (cat.includes("tambahan dokter") || (!cat && /tambahan dokter/.test(text))) return { section: "DOKTER" };
  if (cat.includes("potongan lain") || (!cat && /potongan lain/.test(text))) return { section: "POTONGAN" };
  if (/admin/.test(text)) return { section: "FIXED", fixed: "ADMIN" };
  if (/\bmess\b/.test(text)) return { section: "FIXED", fixed: "MESS" };
  if (/pinalty|penalty|denda/.test(text)) return { section: "FIXED", fixed: "PINALTY ABSEN" };
  if (/test|hiv|kehamilan/.test(text)) return { section: "FIXED", fixed: "TEST RUTIN" };
  if (/dokter|spekulo/.test(text)) return { section: "FIXED", fixed: "SPEKULO" };
  if (/loker/.test(text)) return { section: "FIXED", fixed: "LOKER" };
  if (/salon/.test(text)) return { section: "FIXED", fixed: "SALON" };
  // Unknown: an addition (bonus/fee, ...) stays on top, an unknown deduction goes to Potongan Lain.
  return it.debit > 0 && it.credit === 0 ? { section: "EXTRA" } : { section: "POTONGAN" };
}

export function buildSheet(input: SheetInput): SheetRow[] {
  const rows: SheetRow[] = [];
  let balance = 0;
  let no = 0;

  const push = (r: Omit<SheetRow, "no" | "balance" | "key"> & { key?: string }, delta: number) => {
    no += 1;
    balance += delta;
    rows.push({ ...r, key: r.key ?? `r${no}`, no, balance });
  };

  const top = (
    section: SheetSection,
    label: string,
    f: Partial<SheetItemIn> & { debit?: number; credit?: number; debitUnit?: number | null },
    blank = false,
  ) =>
    push(
      {
        id: f.id ?? null,
        section,
        date: f.date ?? null,
        dateRaw: f.dateRaw ?? null,
        blockLabel: null,
        blockSpan: 1,
        description: label,
        qty: f.qty ?? null,
        debitUnit: f.debitUnit ?? null,
        debitTotal: f.debit && f.debit > 0 ? f.debit : null,
        creditUnit: null,
        creditTotal: f.credit && f.credit > 0 ? f.credit : null,
        note: f.note ?? null,
        filler: blank,
      },
      (f.debit ?? 0) - (f.credit ?? 0),
    );

  if (input.vcr && input.vcr.total > 0) {
    top("VCR", "TOTAL VCR", { qty: String(input.vcr.count), debit: input.vcr.total, debitUnit: input.vcr.unit });
  }
  if (!input.vcr && input.salary && input.salary > 0) top("GAJI", "GAJI POKOK", { debit: input.salary });

  const placed = input.items.map((it) => ({ it, p: classifyItem(it) }));
  for (const { it } of placed.filter((x) => x.p.section === "EXTRA")) {
    top("EXTRA", it.description.toUpperCase(), it);
  }
  for (const label of FIXED_LABELS) {
    const mine = placed.filter((x) => x.p.section === "FIXED" && x.p.fixed === label);
    if (mine.length === 0) top("FIXED", label, {}, true);
    for (const { it } of mine) top("FIXED", label, it);
  }

  for (const b of BLOCKS) {
    const lines: SheetItemIn[] = [
      ...(b.section === "KASBON" ? input.kasbon : []),
      ...placed.filter((x) => x.p.section === b.section).map((x) => x.it),
    ];
    const span = Math.max(b.min, lines.length);
    const blockTotal = lines.reduce((s, l) => s + Math.max(l.credit, 0) - Math.max(l.debit, 0), 0);
    for (let i = 0; i < span; i++) {
      const l = lines[i];
      const amount = l ? l.credit - l.debit : 0;
      push(
        {
          id: l?.id ?? null,
          section: b.section,
          date: l?.date ?? null,
          dateRaw: l?.dateRaw ?? null,
          blockLabel: i === 0 ? b.label : null,
          blockSpan: i === 0 ? span : 0,
          description: l?.description ?? "",
          qty: l?.qty ?? null,
          debitUnit: null,
          debitTotal: null,
          creditUnit: l && amount !== 0 ? amount : null,
          creditTotal: i === 0 && lines.length > 0 ? blockTotal : null,
          note: l?.note ?? null,
          filler: !l,
        },
        -amount,
      );
    }
  }
  return rows;
}

export function sheetTotal(rows: SheetRow[]): number {
  return rows.length ? rows[rows.length - 1].balance : 0;
}
