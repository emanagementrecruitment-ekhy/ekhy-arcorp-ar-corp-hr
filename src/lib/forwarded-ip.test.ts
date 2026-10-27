import { test } from "node:test";
import assert from "node:assert/strict";
import { ipFromForwardedFor } from "./forwarded-ip";

test("uses the last x-forwarded-for entry, ignoring forged leading ones", () => {
  assert.equal(ipFromForwardedFor("1.1.1.1, 2.2.2.2, 9.9.9.9"), "9.9.9.9");
  assert.equal(ipFromForwardedFor("9.9.9.9"), "9.9.9.9");
  assert.equal(ipFromForwardedFor(""), null);
  assert.equal(ipFromForwardedFor(null), null);
});
