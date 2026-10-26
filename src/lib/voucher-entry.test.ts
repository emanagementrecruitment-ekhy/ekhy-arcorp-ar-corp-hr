import test from "node:test";
import assert from "node:assert/strict";
import { parseVoucherEntry } from "./voucher-entry";

test("normal Tera: single qty at own level", () => {
  assert.deepEqual(parseVoucherEntry(false, { qty: 3 }), { ok: true, lines: [{ category: null, qty: 3 }] });
  assert.equal(parseVoucherEntry(false, { qty: 0 }).ok, false);
  assert.equal(parseVoucherEntry(false, {}).ok, false);
});

test("Travel / Classic T5: S and D entered separately", () => {
  assert.deepEqual(parseVoucherEntry(true, { qtyS: 2, qtyD: 1 }), {
    ok: true,
    lines: [{ category: "FL", qty: 2 }, { category: "CLASSIC_D", qty: 1 }],
  });
  assert.deepEqual(parseVoucherEntry(true, { qtyS: "", qtyD: 4 }), { ok: true, lines: [{ category: "CLASSIC_D", qty: 4 }] });
});

test("Travel / Classic T5: rejects empty, negative, fractional-to-zero and oversized input", () => {
  assert.equal(parseVoucherEntry(true, { qtyS: 0, qtyD: 0 }).ok, false);
  assert.equal(parseVoucherEntry(true, { qty: 5 }).ok, false);
  assert.equal(parseVoucherEntry(true, { qtyS: -1 }).ok, false);
  assert.equal(parseVoucherEntry(true, { qtyD: 201 }).ok, false);
  assert.equal(parseVoucherEntry(true, { qtyS: "abc" }).ok, false);
});
