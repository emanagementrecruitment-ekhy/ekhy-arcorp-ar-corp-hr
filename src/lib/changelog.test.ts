import { test } from "node:test";
import assert from "node:assert/strict";
import { parseChangelog } from "./changelog";

test("parseChangelog maps groups, strips marks, respects the limit", () => {
  const md = "# Changelog\n\n## [Unreleased]\n\n### Added\n- Menu `Baru` dibuat\n\n### Fixed\n- **Bug** diperbaiki\n- Bug kedua\n";
  assert.deepEqual(parseChangelog(md), [
    { group: "Baru", text: "Menu Baru dibuat" },
    { group: "Diperbaiki", text: "Bug diperbaiki" },
    { group: "Diperbaiki", text: "Bug kedua" },
  ]);
  assert.equal(parseChangelog(md, 2).length, 2);
  assert.deepEqual(parseChangelog("tidak ada daftar"), []);
});
