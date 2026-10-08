import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePing, shouldAcceptPing, newestFix, MIN_PING_INTERVAL_MS, MAX_ACCURACY_M } from "./live-location";

test("parsePing accepts a normal reading", () => {
  assert.deepEqual(parsePing({ lat: -6.2, lng: 106.8, accuracy: 25 }), { lat: -6.2, lng: 106.8 });
});

test("parsePing rejects non-objects, strings, NaN and out-of-range values", () => {
  for (const bad of [null, undefined, "x", 5, {}, { lat: "1", lng: "2" }, { lat: NaN, lng: 1 }, { lat: 91, lng: 0 }, { lat: 0, lng: 181 }, { lat: Infinity, lng: 0 }]) {
    assert.equal(parsePing(bad), null);
  }
});

test("parsePing rejects imprecise readings but keeps the boundary", () => {
  assert.equal(parsePing({ lat: 1, lng: 1, accuracy: MAX_ACCURACY_M + 1 }), null);
  assert.deepEqual(parsePing({ lat: 1, lng: 1, accuracy: MAX_ACCURACY_M }), { lat: 1, lng: 1 });
});

test("shouldAcceptPing rate-limits per employee", () => {
  const now = new Date("2026-10-08T10:00:00Z");
  assert.equal(shouldAcceptPing(null, now), true);
  assert.equal(shouldAcceptPing(new Date(now.getTime() - 5_000), now), false);
  assert.equal(shouldAcceptPing(new Date(now.getTime() - MIN_PING_INTERVAL_MS), now), true);
});

test("newestFix prefers the newer of live ping and login", () => {
  const t = (s: number) => new Date(1_700_000_000_000 + s * 1000);
  assert.equal(newestFix(null, null), "none");
  assert.equal(newestFix(t(0), null), "login");
  assert.equal(newestFix(null, t(0)), "live");
  assert.equal(newestFix(t(10), t(5)), "login");
  assert.equal(newestFix(t(5), t(10)), "live");
  assert.equal(newestFix(t(5), t(5)), "login");
});
