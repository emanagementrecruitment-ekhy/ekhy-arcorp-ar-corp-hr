import { test } from "node:test";
import assert from "node:assert/strict";
import { matchSupervisorQuery, supervisorAnswer, supervisorPayRefusal, type RosterPerson } from "./ai-supervisor-rules";

const ROSTER: RosterPerson[] = [
  { name: "Grace Wijaya", code: "AR-21", isTera: true, checkedInToday: true, checkedInAt: "08.04", days: [1, 2, 3] },
  { name: "Budi Santoso", code: "AR-22", isTera: false, checkedInToday: false, checkedInAt: null, days: [1] },
  { name: "Budi Hartono", code: "AR-23", isTera: false, checkedInToday: false, checkedInAt: null, days: [] },
  { name: "Siti Aminah", code: "AR-24", isTera: false, checkedInToday: true, checkedInAt: "09.10", days: [1, 2] },
];
const CTX = { dateLabel: "2026-11-02", monthLabel: "November 2026", minDays: 20 };

test("matchSupervisorQuery understands the team attendance questions", () => {
  assert.deepEqual(matchSupervisorQuery("siapa yang belum absen hari ini", ROSTER), { kind: "belum" });
  assert.deepEqual(matchSupervisorQuery("siapa saja yang tidak hadir", ROSTER), { kind: "belum" });
  assert.deepEqual(matchSupervisorQuery("siapa yang sudah absen", ROSTER), { kind: "sudah" });
  assert.deepEqual(matchSupervisorQuery("rekap absen bulan ini", ROSTER), { kind: "rekap" });
  assert.deepEqual(matchSupervisorQuery("daftar absen semua karyawan", ROSTER), { kind: "rekap" });
  assert.deepEqual(matchSupervisorQuery("absen Grace bulan ini", ROSTER), { kind: "orang", matches: [0] });
  assert.deepEqual(matchSupervisorQuery("Grace sudah absen belum?", ROSTER), { kind: "orang", matches: [0] });
  assert.deepEqual(matchSupervisorQuery("absen AR-24 hari ini", ROSTER), { kind: "orang", matches: [3] });
});

test("a shared first name returns every match so the answer can show both", () => {
  assert.deepEqual(matchSupervisorQuery("absen budi hari ini", ROSTER), { kind: "orang", matches: [1, 2] });
  assert.deepEqual(matchSupervisorQuery("absen budi santoso", ROSTER), { kind: "orang", matches: [1] });
});

test("money topics and non-attendance questions are not handled here", () => {
  assert.equal(matchSupervisorQuery("berapa gaji Grace", ROSTER), null);
  assert.equal(matchSupervisorQuery("vcr Grace hari ini dan absennya", ROSTER), null);
  assert.equal(matchSupervisorQuery("kasbon siapa yang belum absen", ROSTER), null);
  assert.equal(matchSupervisorQuery("cuaca hari ini bagaimana", ROSTER), null);
  assert.equal(matchSupervisorQuery("Halo Angel", ROSTER), null);
});

test("supervisorAnswer lists names with Tera tagged, never any pay data", () => {
  const belum = supervisorAnswer({ kind: "belum" }, ROSTER, CTX);
  assert.match(belum, /2 dari 4/);
  assert.match(belum, /Budi Santoso \(AR-22\)/);
  assert.doesNotMatch(belum, /Grace/);
  const sudah = supervisorAnswer({ kind: "sudah" }, ROSTER, CTX);
  assert.match(sudah, /Grace Wijaya \(AR-21, Tera\) — 08\.04/);
  const rekap = supervisorAnswer({ kind: "rekap" }, ROSTER, CTX);
  assert.match(rekap, /Grace Wijaya \(AR-21, Tera\): 3 hari/);
  const orang = supervisorAnswer({ kind: "orang", matches: [0] }, ROSTER, CTX);
  assert.match(orang, /sudah absen hari ini pukul 08\.04/);
  assert.match(orang, /Tanggal hadir: 1, 2, 3/);
  for (const t of [belum, sudah, rekap, orang]) assert.doesNotMatch(t, /Rp|voucher|kasbon \d/i);
});

test("everyone present and an empty roster have friendly answers; long lists are capped", () => {
  const all = ROSTER.map((p) => ({ ...p, checkedInToday: true }));
  assert.match(supervisorAnswer({ kind: "belum" }, all, CTX), /Semua 4 karyawan dan Tera sudah absen/);
  assert.match(supervisorAnswer({ kind: "belum" }, [], CTX), /Belum ada karyawan/);
  const many = Array.from({ length: 55 }, (_, i) => ({ ...ROSTER[1], name: `Orang ${i}`, code: `X-${i}` }));
  assert.match(supervisorAnswer({ kind: "belum" }, many, CTX), /dan 15 lainnya/);
});

test("supervisorPayRefusal explains what a Kepala Mess may ask", () => {
  const t = supervisorPayRefusal("Rina");
  assert.match(t, /absensi/);
  assert.match(t, /Kirim ke kantor/);
});
