import { test } from "node:test";
import assert from "node:assert/strict";
import { kasbonKindFor } from "./kasbon-kind";

test("Tera requests are Terapis, everyone else is Karyawan", () => {
  assert.equal(kasbonKindFor("Tera"), "TERAPIS");
  assert.equal(kasbonKindFor("Staff"), "KARYAWAN");
  assert.equal(kasbonKindFor("Kepala Mess"), "KARYAWAN");
});
