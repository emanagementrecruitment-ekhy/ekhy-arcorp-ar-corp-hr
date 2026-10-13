import { test } from "node:test";
import assert from "node:assert/strict";
import { matchEmployeeByName, monthFromText, parseMatrixSheet } from "./attendance-matrix";

/** A sheet shaped like the office's "LAPORAN ABSENSI BV JULY 2026" workbook. */
function sheet(title: string, people: { no: unknown; name: unknown; cells: unknown[] }[], dayCount = 31): unknown[][] {
  const header: unknown[] = ["NO", "NAMA ", "LINK", "GRADE "];
  for (let d = 1; d <= dayCount; d++) header.push(d);
  header.push("M1", "TOTAL");
  const rows: unknown[][] = [[title], [], ["DATA BV", null, null, null, "R", "K"], header, ["AGENT AA"]];
  for (const p of people) {
    const cells = [...p.cells];
    while (cells.length < dayCount) cells.push(null);
    rows.push([p.no, p.name, "AA", "ROSE", ...cells, 12, 4]);
  }
  rows.push(["O", "OFF / TP"], ["M", "MENS"]);
  return rows;
}

test("monthFromText reads Indonesian and English months and the year", () => {
  assert.deepEqual(monthFromText("LAPORAN ABSENSI BV JULY 2026"), { year: 2026, month: 7 });
  assert.deepEqual(monthFromText("LAPORAN VCR BV DESEMBER 2025"), { year: 2025, month: 12 });
  assert.deepEqual(monthFromText("LAPORAN ABSENSI BV JUNY 2026"), { year: 2026, month: 6 });
  assert.equal(monthFromText("JULY"), null);
  assert.equal(monthFromText("LAPORAN 2026"), null);
});

test("numbers (zero included) are present days; letters and blanks are not", () => {
  const rows = sheet("LAPORAN ABSENSI BV JULY 2026", [
    { no: 1, name: "CANTIKA", cells: [4, 2, "O", null, 0, "M", "S", ".", 3] },
    { no: 2, name: "SYIFA", cells: [] },
  ]);
  const parsed = parseMatrixSheet("JULY", rows)!;
  assert.equal(parsed.year, 2026);
  assert.equal(parsed.month, 7);
  assert.deepEqual(parsed.people.map((p) => p.name), ["CANTIKA", "SYIFA"]);
  assert.deepEqual(parsed.people[0].days, [1, 2, 5, 9]);
  assert.deepEqual(parsed.people[1].days, []);
});

test("section rows, the legend and unnamed rows are not people", () => {
  const rows = sheet("LAPORAN ABSENSI BV JULY 2026", [
    { no: 1, name: "LEXA", cells: [5] },
    { no: 2, name: null, cells: [1] },
    { no: "I", name: "IJIN SAKIT", cells: [] },
  ]);
  assert.deepEqual(parseMatrixSheet("JULY", rows)!.people.map((p) => p.name), ["LEXA"]);
});

test("days beyond the month length are ignored (February)", () => {
  const rows = sheet("LAPORAN VCR BV FEBRUARY 2026", [{ no: 1, name: "ARUM", cells: Array(31).fill(1) }]);
  const parsed = parseMatrixSheet("FEBRUARY", rows)!;
  assert.equal(parsed.people[0].days.length, 28);
  assert.equal(Math.max(...parsed.people[0].days), 28);
});

test("a sheet title without a year falls back to the sheet name, and none at all is not a matrix", () => {
  assert.equal(parseMatrixSheet("JANUARI 2026", sheet("LAPORAN", [{ no: 1, name: "A", cells: [1] }]))!.month, 1);
  assert.equal(parseMatrixSheet("JULY", sheet("LAPORAN", [{ no: 1, name: "A", cells: [1] }])), null);
});

test("dashboards and short tables are not matrices", () => {
  assert.equal(parseMatrixSheet("DASHBOARD", [["DASHBOARD VCR JULY 2026"], ["GRADE", "JUMLAH"], ["ROSE", 16]]), null);
  assert.equal(parseMatrixSheet("X", sheet("LAPORAN ABSENSI BV JULY 2026", [{ no: 1, name: "A", cells: [1] }], 10)), null);
});

test("matchEmployeeByName matches first names, prefers exact, and reports ambiguity", () => {
  const people = [{ name: "Sherly Amelia" }, { name: "Jihan Putri" }, { name: "Mona" }, { name: "Mona Lisa" }, { name: "Dewi A" }, { name: "Dewi B" }];
  const one = matchEmployeeByName("SHERLY", people);
  assert.ok(one.ok && one.employee.name === "Sherly Amelia");
  const exact = matchEmployeeByName("mona", people);
  assert.ok(exact.ok && exact.employee.name === "Mona");
  const amb = matchEmployeeByName("DEWI", people);
  assert.ok(!amb.ok && amb.reason === "ambiguous" && amb.candidates.length === 2);
  const none = matchEmployeeByName("ZAHRA", people);
  assert.ok(!none.ok && none.reason === "none");
});
