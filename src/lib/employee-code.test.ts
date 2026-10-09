import { test } from "node:test";
import assert from "node:assert/strict";
import { codePrefixForRole, nextCodeNumber, formatCode } from "./employee-code";

test("Tera gets EQ, everyone else AR", () => {
  assert.equal(codePrefixForRole("Tera"), "EQ");
  assert.equal(codePrefixForRole("Staff"), "AR");
  assert.equal(codePrefixForRole("Manager"), "AR");
});

test("nextCodeNumber counts per prefix and ignores other shapes", () => {
  const codes = ["AR-01", "AR-07", "EQ-03", "AR-xx", "XAR-99", "AR-12b"];
  assert.equal(nextCodeNumber(codes, "AR"), 8);
  assert.equal(nextCodeNumber(codes, "EQ"), 4);
  assert.equal(nextCodeNumber([], "EQ"), 1);
});

test("formatCode pads to two digits", () => {
  assert.equal(formatCode("EQ", 4), "EQ-04");
  assert.equal(formatCode("AR", 123), "AR-123");
});
