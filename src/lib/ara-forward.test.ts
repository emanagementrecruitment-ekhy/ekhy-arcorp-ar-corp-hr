import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTO_RECEIPT_TEXT, forwardedChatText } from "./ara-forward";

test("forwarded chat text keeps the employee's words and marks that it came through Ara", () => {
  assert.equal(forwardedChatText("  Saya mau izin besok "), "Lewat asisten Ara: Saya mau izin besok");
});

test("the automatic receipt only confirms receipt: it names the human answerers and decides nothing", () => {
  assert.match(AUTO_RECEIPT_TEXT, /^Balasan otomatis/);
  assert.match(AUTO_RECEIPT_TEXT, /Owner\/Admin/);
  assert.doesNotMatch(AUTO_RECEIPT_TEXT, /disetujui|diizinkan|ditolak|Call Center/i);
});
