import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAttendanceCode, toneForMark } from "./attendance-codes";

test("normalizeAttendanceCode accepts codes case-insensitively", () => {
  assert.equal(normalizeAttendanceCode("m"), "M");
  assert.equal(normalizeAttendanceCode(" pk "), "PK");
  assert.equal(normalizeAttendanceCode("s"), "S");
});

test("normalizeAttendanceCode: empty clears, unknown is rejected", () => {
  assert.equal(normalizeAttendanceCode(""), null);
  assert.equal(normalizeAttendanceCode("  "), null);
  assert.equal(normalizeAttendanceCode(null), null);
  assert.equal(normalizeAttendanceCode("X"), undefined);
  assert.equal(normalizeAttendanceCode("toString"), undefined);
  assert.equal(normalizeAttendanceCode(5), undefined);
});

test("toneForMark: code colour wins, then orange for manual, else plain", () => {
  assert.equal(toneForMark("M", true), "red");
  assert.equal(toneForMark("O", false), "yellow");
  assert.equal(toneForMark("P", false), "green");
  assert.equal(toneForMark("PK", false), "green");
  assert.equal(toneForMark("S", false), "blue");
  assert.equal(toneForMark(null, true), "orange");
  assert.equal(toneForMark(null, false), null);
  assert.equal(toneForMark("zzz", false), null);
});
