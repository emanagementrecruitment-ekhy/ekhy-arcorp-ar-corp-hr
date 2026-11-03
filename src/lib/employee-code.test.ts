import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanCodePrefix, codePrefixForRole, exampleCode, nextCodeNumber, formatCode } from "./employee-code";

test("Tera gets EQ, everyone else AR (default client)", () => {
  assert.equal(codePrefixForRole("Tera"), "EQ");
  assert.equal(codePrefixForRole("Staff"), "AR");
  assert.equal(codePrefixForRole("Manager"), "AR");
});

test("nextCodeNumber counts per prefix, new and old shapes, and ignores other shapes", () => {
  const codes = ["AR-01", "AR-07", "AR008", "EQ-03", "AR-xx", "XAR-99", "AR-12b", "AR9x"];
  assert.equal(nextCodeNumber(codes, "AR"), 9);
  assert.equal(nextCodeNumber(codes, "EQ"), 4);
  assert.equal(nextCodeNumber([], "EQ"), 1);
});

test("a client prefix never counts another client's codes", () => {
  assert.equal(nextCodeNumber(["AR-05", "DR002"], "DR"), 3);
  assert.equal(nextCodeNumber(["AR-05", "DR002"], "AM"), 1);
});

test("formatCode pads to three digits with no dash", () => {
  assert.equal(formatCode("EQ", 4), "EQ004");
  assert.equal(formatCode("AR", 1), "AR001");
  assert.equal(formatCode("BT", 123), "BT123");
  assert.equal(formatCode("AD", 1234), "AD1234");
});

test("cleanCodePrefix accepts 1-4 letters/digits and falls back otherwise", () => {
  assert.equal(cleanCodePrefix(" dr ", "AR"), "DR");
  assert.equal(cleanCodePrefix("A-M", "EQ"), "EQ");
  assert.equal(cleanCodePrefix("", "EQ"), "EQ");
  assert.equal(cleanCodePrefix(undefined, "AR"), "AR");
  assert.equal(cleanCodePrefix("TOOLONG", "AR"), "AR");
});

test("exampleCode uses the configured prefixes", () => {
  assert.equal(exampleCode("staff", 7), "AR007");
  assert.equal(exampleCode("tera"), "EQ001");
});
