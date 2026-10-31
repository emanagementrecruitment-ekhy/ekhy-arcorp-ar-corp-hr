import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { decryptBackup, encryptBackup, passphraseProblem } from "./backup-crypto";

const PASS = "kata-sandi-uji-12345";
const sample = Buffer.from("SQLite format 3\u0000 data karyawan: NIK 3171012345678901, tanggal lahir 1990-01-01");

test("a backup round-trips with the right passphrase", () => {
  const blob = encryptBackup(sample, PASS);
  assert.ok(decryptBackup(blob, PASS).equals(sample));
});

test("the file is not readable without the key: no plaintext, and every encryption differs", () => {
  const a = encryptBackup(sample, PASS);
  const b = encryptBackup(sample, PASS);
  assert.ok(!a.includes(Buffer.from("3171012345678901")));
  assert.ok(!a.includes(Buffer.from("SQLite format 3")));
  assert.ok(!a.equals(b)); // random salt and iv
  assert.equal(a.subarray(0, 4).toString(), "ARBK");
});

test("a wrong passphrase is refused", () => {
  const blob = encryptBackup(sample, PASS);
  assert.throws(() => decryptBackup(blob, "salah-salah-salah-1"), /Kata sandi salah atau berkas rusak/);
});

test("a changed byte anywhere (header, tag or data) is detected", () => {
  const blob = encryptBackup(sample, PASS);
  for (const offset of [9, 30, 40, blob.length - 1]) {
    const bad = Buffer.from(blob);
    bad[offset] ^= 0x01;
    assert.throws(() => decryptBackup(bad, PASS), /Kata sandi salah atau berkas rusak/, `offset ${offset}`);
  }
});

test("a file that is not a backup, or has absurd scrypt settings, is refused without heavy work", () => {
  assert.throws(() => decryptBackup(Buffer.from("bukan backup"), PASS), /Bukan berkas backup/);
  const blob = encryptBackup(sample, PASS);
  const crafted = Buffer.from(blob);
  crafted[5] = 30; // logN far above the allowed maximum
  assert.throws(() => decryptBackup(crafted, PASS), /Kata sandi salah atau berkas rusak/);
});

test("passphrase rules", () => {
  assert.equal(passphraseProblem(PASS), null);
  assert.match(passphraseProblem("pendek")!, /minimal 12/);
  assert.match(passphraseProblem("aaaaaaaaaaaaaaaa")!, /terlalu mudah ditebak/);
  assert.match(passphraseProblem(undefined)!, /wajib/);
  assert.throws(() => encryptBackup(sample, "pendek"), /minimal 12/);
});

test("a passphrase with non-ASCII characters works", () => {
  const pass = "Pa$$w0rd-Ünïcødé-日本語-123";
  assert.ok(decryptBackup(encryptBackup(sample, pass), pass).equals(sample));
});

test("the stand-alone decrypt script opens what the app wrote, and refuses a wrong passphrase", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "arbk-test-"));
  try {
    const enc = path.join(dir, "b.db.enc");
    const out = path.join(dir, "b.db");
    writeFileSync(enc, encryptBackup(sample, PASS));
    const script = path.join(process.cwd(), "scripts", "decrypt-backup.mjs");
    execFileSync(process.execPath, [script, enc, out], { env: { ...process.env, ARBK_PASSPHRASE: PASS }, stdio: "pipe" });
    assert.ok(readFileSync(out).equals(sample));
    assert.throws(
      () => execFileSync(process.execPath, [script, enc, path.join(dir, "x.db")], { env: { ...process.env, ARBK_PASSPHRASE: "salah-salah-salah-1" }, stdio: "pipe" }),
      /Command failed/,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
