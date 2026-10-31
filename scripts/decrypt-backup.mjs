#!/usr/bin/env node
// Opens an encrypted AR Corp backup (arcorp-backup-YYYY-MM-DD.db.enc) and writes the original SQLite database.
// Stand-alone: needs only Node.js 18 or newer, not the app. Run it on a computer you trust.
//
//   node scripts/decrypt-backup.mjs arcorp-backup-2026-11-01.db.enc arcorp-backup.db
//
// It asks for the passphrase you typed when you downloaded the backup (hidden while typing). For automation the
// passphrase can instead be given in the ARBK_PASSPHRASE environment variable. Format: see src/lib/backup-crypto.ts.
import { createDecipheriv, scryptSync } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const MAGIC = "ARBK";
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const HEADER_LEN = 4 + 4 + SALT_LEN + IV_LEN;

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error("Pemakaian: node scripts/decrypt-backup.mjs <berkas.db.enc> <hasil.db>");
  process.exit(2);
}
if (!existsSync(input)) {
  console.error(`Berkas tidak ditemukan: ${input}`);
  process.exit(2);
}
if (existsSync(output)) {
  console.error(`Berkas hasil sudah ada, tidak ditimpa: ${output}`);
  process.exit(2);
}

function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setEncoding("utf8");
    if (!stdin.isTTY) {
      stdin.once("data", (d) => resolve(String(d).split(/\r?\n/)[0]));
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    let typed = "";
    const onData = (chunk) => {
      for (const c of chunk) {
        if (c === "\r" || c === "\n" || c === "\u0004") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(typed);
        }
        if (c === "\u0003") process.exit(130);
        if (c === "\u007f" || c === "\b") typed = typed.slice(0, -1);
        else typed += c;
      }
    };
    stdin.on("data", onData);
  });
}

const blob = readFileSync(input);
if (blob.length < HEADER_LEN + TAG_LEN || blob.subarray(0, 4).toString() !== MAGIC) {
  console.error("Bukan berkas backup AR Corp.");
  process.exit(1);
}
if (blob[4] !== 1) {
  console.error("Versi berkas backup tidak dikenal.");
  process.exit(1);
}
const [logN, r, p] = [blob[5], blob[6], blob[7]];
if (logN < 10 || logN > 20 || r < 1 || r > 16 || p < 1 || p > 4) {
  console.error("Kata sandi salah atau berkas rusak.");
  process.exit(1);
}

const passphrase = process.env.ARBK_PASSPHRASE ?? (await askHidden("Kata sandi backup: "));
try {
  const salt = blob.subarray(8, 8 + SALT_LEN);
  const iv = blob.subarray(8 + SALT_LEN, HEADER_LEN);
  const tag = blob.subarray(HEADER_LEN, HEADER_LEN + TAG_LEN);
  const key = scryptSync(passphrase.normalize("NFKC"), salt, 32, { N: 2 ** logN, r, p, maxmem: 512 * 1024 * 1024 });
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(blob.subarray(0, HEADER_LEN));
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(blob.subarray(HEADER_LEN + TAG_LEN)), decipher.final()]);
  writeFileSync(output, plain, { flag: "wx" });
  console.log(`Berhasil: ${output} (${Math.round(plain.length / 1024)} KB)`);
} catch {
  console.error("Kata sandi salah atau berkas rusak.");
  process.exit(1);
}
