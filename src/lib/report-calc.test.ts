import { test } from "node:test";
import assert from "node:assert/strict";
import { salaryForPeriod } from "./report-calc";

test("a month is the full salary, a week is 7/30 and a day is 1/30", () => {
  assert.equal(salaryForPeriod(3_000_000, "bulanan"), 3_000_000);
  assert.equal(salaryForPeriod(3_000_000, "mingguan"), 700_000);
  assert.equal(salaryForPeriod(3_000_000, "harian"), 100_000);
});

test("rounds to whole rupiah", () => {
  assert.equal(salaryForPeriod(1_000_000, "harian"), 33_333);
});

test("missing or negative salary counts as zero", () => {
  assert.equal(salaryForPeriod(null, "bulanan"), 0);
  assert.equal(salaryForPeriod(undefined, "harian"), 0);
  assert.equal(salaryForPeriod(-5, "mingguan"), 0);
});
