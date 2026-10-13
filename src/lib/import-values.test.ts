import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmount, parseDateKey, parseKasbonStatus, parseMonthKey, parseYesNo } from "./import-values";

test("parseAmount reads Indonesian money notation", () => {
  assert.equal(parseAmount("1500000"), 1_500_000);
  assert.equal(parseAmount("1.500.000"), 1_500_000);
  assert.equal(parseAmount("Rp 1.500.000,-"), 1_500_000);
  assert.equal(parseAmount("Rp 250.000,00"), 250_000);
  assert.equal(parseAmount(750000), 750_000);
  assert.equal(parseAmount(0), null);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount(undefined), null);
});

test("parseDateKey accepts ISO, day-first and Excel serial dates, and rejects impossible ones", () => {
  assert.equal(parseDateKey("2026-10-13"), "2026-10-13");
  assert.equal(parseDateKey("2026-1-5"), "2026-01-05");
  assert.equal(parseDateKey("13/10/2026"), "2026-10-13");
  assert.equal(parseDateKey("5-1-2026"), "2026-01-05");
  assert.equal(parseDateKey(46308), "2026-10-13"); // Excel serial for 13 Oct 2026
  assert.equal(parseDateKey("46308"), "2026-10-13"); // the same serial as text, as pickField() returns it
  assert.equal(parseDateKey("2026-02-30"), null);
  assert.equal(parseDateKey("31/04/2026"), null);
  assert.equal(parseDateKey("kemarin"), null);
  assert.equal(parseDateKey(12), null);
});

test("parseMonthKey reads numeric and named months", () => {
  assert.equal(parseMonthKey("2026-10"), "2026-10");
  assert.equal(parseMonthKey("10/2026"), "2026-10");
  assert.equal(parseMonthKey("Oktober 2026"), "2026-10");
  assert.equal(parseMonthKey("JUNY 2026"), "2026-06");
  assert.equal(parseMonthKey("2026-13"), null);
  assert.equal(parseMonthKey("Oktober"), null);
  assert.equal(parseMonthKey(5), null);
});

test("parseKasbonStatus defaults to waiting and rejects unknown words", () => {
  assert.equal(parseKasbonStatus(""), "MENUNGGU_OWNER");
  assert.equal(parseKasbonStatus(undefined), "MENUNGGU_OWNER");
  assert.equal(parseKasbonStatus("Menunggu"), "MENUNGGU_OWNER");
  assert.equal(parseKasbonStatus("DISETUJUI"), "DISETUJUI");
  assert.equal(parseKasbonStatus("acc"), "DISETUJUI");
  assert.equal(parseKasbonStatus("Ditolak"), "DITOLAK");
  assert.equal(parseKasbonStatus("mungkin"), null);
});

test("parseYesNo", () => {
  for (const yes of ["Ya", "y", "SUDAH", "1", "true"]) assert.equal(parseYesNo(yes), true);
  for (const no of ["", "tidak", "belum", "0"]) assert.equal(parseYesNo(no), false);
  assert.equal(parseYesNo(1), true);
  assert.equal(parseYesNo(undefined), false);
});
