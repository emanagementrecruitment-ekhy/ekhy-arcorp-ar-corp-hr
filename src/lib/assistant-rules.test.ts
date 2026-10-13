import { test } from "node:test";
import assert from "node:assert/strict";
import { jakartaClock, tasksDue, taskState, vcrFlags, listNames, hhmm, ASSISTANT_TASKS } from "./assistant-rules";

test("jakartaClock reads Jakarta time regardless of the host timezone", () => {
  // 2026-10-13 01:30 UTC = 08:30 WIB the same day
  const a = jakartaClock(new Date("2026-10-13T01:30:00Z"));
  assert.equal(a.dateKey, "2026-10-13");
  assert.equal(a.minutes, 8 * 60 + 30);
  // 2026-10-13 18:00 UTC = 01:00 WIB the NEXT day
  const b = jakartaClock(new Date("2026-10-13T18:00:00Z"));
  assert.equal(b.dateKey, "2026-10-14");
  assert.equal(b.minutes, 60);
  assert.equal(b.dayStartUtc.toISOString(), "2026-10-13T17:00:00.000Z");
});

test("hhmm formats minutes as clock text", () => {
  assert.equal(hhmm(8 * 60 + 5), "08.05");
  assert.equal(hhmm(21 * 60), "21.00");
});

test("tasksDue only returns tasks inside their window that have not run", () => {
  assert.deepEqual(tasksDue(7 * 60, new Set()).map((t) => t.id), []);
  assert.deepEqual(tasksDue(8 * 60, new Set()).map((t) => t.id), ["checkin_1"]);
  assert.deepEqual(tasksDue(8 * 60 + 30, new Set(["checkin_1"])).map((t) => t.id), []);
  // 21.15: the VCR reminder window (19.30-21.30) and the VCR report (from 21.00) overlap
  assert.deepEqual(tasksDue(21 * 60 + 15, new Set()).map((t) => t.id).sort(), ["vcr_reminder", "vcr_report"]);
  // after every window nothing is left to run
  assert.deepEqual(tasksDue(23 * 60 + 45, new Set()), []);
});

test("the late-checkin reminder lands before the 12.15 penalty cut-off", () => {
  const second = ASSISTANT_TASKS.find((t) => t.id === "checkin_2")!;
  assert.ok(second.at < 12 * 60 + 15);
});

test("taskState", () => {
  const t = ASSISTANT_TASKS[0];
  assert.equal(taskState(t, 9 * 60, true), "selesai");
  assert.equal(taskState(t, 7 * 60, false), "menunggu");
  assert.equal(taskState(t, 12 * 60, false), "terlewat");
});

test("vcrFlags: quiet day, low total, spike", () => {
  assert.deepEqual(vcrFlags({ todayCount: 40, avgCount: 42, perTera: [{ name: "A", today: 3, avg: 3 }] }), []);
  assert.equal(vcrFlags({ todayCount: 10, avgCount: 40, perTera: [] }).length, 1);
  // too little history to call a low day
  assert.deepEqual(vcrFlags({ todayCount: 0, avgCount: 2, perTera: [] }), []);
  const spike = vcrFlags({ todayCount: 30, avgCount: 30, perTera: [{ name: "Rani", today: 12, avg: 3 }] });
  assert.equal(spike.length, 1);
  assert.match(spike[0], /Rani/);
  // a big day for someone with no history is not flagged as a spike
  assert.deepEqual(vcrFlags({ todayCount: 30, avgCount: 30, perTera: [{ name: "Baru", today: 12, avg: 0 }] }), []);
});

test("listNames truncates long lists", () => {
  assert.equal(listNames(["A", "B"]), "A, B");
  assert.equal(listNames(["1", "2", "3"], 2), "1, 2 dan 1 lainnya");
});
