import { test } from "node:test";
import assert from "node:assert/strict";
import { maskEmail } from "./mask-email";

test("maskEmail keeps two characters and the domain", () => {
  assert.equal(maskEmail("budi.santoso@gmail.com"), "bu***@gmail.com");
  assert.equal(maskEmail("a@x.id"), "a***@x.id");
});

test("maskEmail handles malformed input", () => {
  assert.equal(maskEmail("no-at-sign"), "***");
  assert.equal(maskEmail("@x.id"), "***");
});
