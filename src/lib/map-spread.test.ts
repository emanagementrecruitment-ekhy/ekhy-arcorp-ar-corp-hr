import { test } from "node:test";
import assert from "node:assert/strict";
import { spreadOffsets } from "./map-spread";

const hq = { lat: -6.2, lng: 106.8 };

test("a lone pin away from the office is not moved", () => {
  const m = spreadOffsets(hq, [{ id: "a", lat: -7, lng: 107 }]);
  assert.deepEqual(m.get("a"), [0, 0]);
});

test("pins on the same spot fan out to distinct offsets", () => {
  const pins = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, lat: -6.2, lng: 106.8 }));
  const m = spreadOffsets(hq, pins);
  const seen = new Set([...m.values()].map((v) => v.join(",")));
  assert.equal(seen.size, 5);
  for (const v of m.values()) assert.notDeepEqual(v, [0, 0]);
});

test("a single pin on the office spot is pushed off the office marker", () => {
  const m = spreadOffsets(hq, [{ id: "a", lat: -6.2, lng: 106.8 }]);
  assert.notDeepEqual(m.get("a"), [0, 0]);
});

test("more than one ring still gives unique offsets", () => {
  const pins = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, lat: -1, lng: 100 }));
  const seen = new Set([...spreadOffsets(hq, pins).values()].map((v) => v.join(",")));
  assert.equal(seen.size, 12);
});
