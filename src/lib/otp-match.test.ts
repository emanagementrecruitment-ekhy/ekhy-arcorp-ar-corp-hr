import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { matchOtp, mayLogOtpCode } from "./otp-match";

const NOW = Date.parse("2026-10-26T12:00:00Z");
const future = new Date(NOW + 60_000);
const past = new Date(NOW - 60_000);

async function cand(id: string, code: string, over: Partial<{ expiresAt: Date; attempts: number }> = {}) {
  return { id, codeHash: await bcrypt.hash(code, 4), expiresAt: future, attempts: 0, ...over };
}

test("accepts the older code when two were issued back to back", async () => {
  const r = await matchOtp("111111", [await cand("new", "222222"), await cand("old", "111111")], 5, NOW);
  assert.deepEqual(r.ok && r.matchedId, "old");
});

test("accepts the newest code", async () => {
  const r = await matchOtp("222222", [await cand("new", "222222"), await cand("old", "111111")], 5, NOW);
  assert.equal(r.ok && r.matchedId, "new");
});

test("wrong code is a mismatch and reports which codes to count against", async () => {
  const r = await matchOtp("999999", [await cand("a", "111111"), await cand("b", "222222")], 5, NOW);
  assert.deepEqual(r, { ok: false, reason: "mismatch", openIds: ["a", "b"] });
});

test("no codes, expired codes and exhausted codes are distinguished", async () => {
  assert.equal((await matchOtp("1", [], 5, NOW)).ok, false);
  const exp = await matchOtp("111111", [await cand("a", "111111", { expiresAt: past })], 5, NOW);
  assert.equal(!exp.ok && exp.reason, "expired");
  const used = await matchOtp("111111", [await cand("a", "111111", { attempts: 5 })], 5, NOW);
  assert.equal(!used.ok && used.reason, "too_many_attempts");
});

test("OTP codes are only logged outside production or in local mode", () => {
  assert.equal(mayLogOtpCode({ NODE_ENV: "production" }), false);
  assert.equal(mayLogOtpCode({ NODE_ENV: "production", ARCORP_LOCAL_MODE: "1" }), true);
  assert.equal(mayLogOtpCode({ NODE_ENV: "development" }), true);
});
