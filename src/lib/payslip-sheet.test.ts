import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSheet, classifyItem, sheetTotal, type SheetItemIn } from "./payslip-sheet";

const item = (p: Partial<SheetItemIn>): SheetItemIn => ({
  id: "x", date: null, dateRaw: null, description: "", category: null, qty: null, debit: 0, credit: 0, note: null, ...p,
});

test("classify: categories and free text", () => {
  assert.equal(classifyItem(item({ category: "Admin", credit: 1 })).fixed, "ADMIN");
  assert.equal(classifyItem(item({ category: "Dokter/Spekulo", credit: 1 })).fixed, "SPEKULO");
  assert.equal(classifyItem(item({ category: "Tambahan Dokter", credit: 1 })).section, "DOKTER");
  assert.equal(classifyItem(item({ description: "Ambil Barang - Seragam", credit: 1 })).section, "BARANG");
  assert.equal(classifyItem(item({ category: "Pinalty Absensi", credit: 1 })).fixed, "PINALTY ABSEN");
  assert.equal(classifyItem(item({ description: "Bonus", debit: 5 })).section, "EXTRA");
  assert.equal(classifyItem(item({ description: "lain-lain", credit: 5 })).section, "POTONGAN");
});

test("excel example: VCR 70 x 500.000 then deductions, total matches", () => {
  const rows = buildSheet({
    vcr: { count: 70, total: 35_000_000, unit: 500_000 },
    salary: null,
    kasbon: [item({ id: null, description: "Kasbon", credit: 1_000_000 })],
    items: [
      item({ category: "Admin", credit: 500_000 }),
      item({ category: "Mess", credit: 1_500_000 }),
      item({ description: "HELLS", category: "Ambil Barang", qty: "1 Pcs", credit: 300_000 }),
      item({ description: "SERAGAM", category: "Ambil Barang", qty: "1 Set", credit: 1_250_000 }),
      item({ category: "Tambahan Dokter", credit: 500_000 }),
      item({ category: "Potongan Lain", credit: 200_000 }),
    ],
  });
  assert.equal(rows[0].description, "TOTAL VCR");
  assert.equal(sheetTotal(rows), 35_000_000 - 500_000 - 1_500_000 - 1_000_000 - 1_550_000 - 500_000 - 200_000);
  const barang = rows.filter((r) => r.section === "BARANG");
  assert.equal(barang.length, 18);
  assert.equal(barang[0].blockSpan, 18);
  assert.equal(barang[0].creditTotal, 1_550_000);
  assert.equal(rows.filter((r) => r.section === "KASBON").length, 5);
  assert.equal(rows.length, 1 + 7 + 5 + 18 + 5 + 13);
});

test("a block with more lines than the minimum grows", () => {
  const items = Array.from({ length: 20 }, (_, i) => item({ id: `b${i}`, category: "Ambil Barang", credit: 10 }));
  const rows = buildSheet({ vcr: null, salary: 3_000_000, kasbon: [], items });
  assert.equal(rows.filter((r) => r.section === "BARANG").length, 20);
  assert.equal(sheetTotal(rows), 3_000_000 - 200);
});
