// Encryption for the database backup file. The key comes from a passphrase the Owner types when downloading and that is
// never stored: not on the server, not in the database, not in a log. Lose the passphrase and the backup cannot be opened.
//
// File format (version 1), all binary:
//   "ARBK" (4) | version (1) | scrypt logN (1) | scrypt r (1) | scrypt p (1) | salt (16) | iv (12) | auth tag (16) | ciphertext
// AES-256-GCM; the first 36 bytes (everything before the tag) are authenticated as additional data, so a changed header
// is detected like a changed byte of the ciphertext. The key is scrypt(passphrase, salt). scripts/decrypt-backup.mjs
// reads this format without the rest of the app, so keep the two in step.
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { MAX_PASSPHRASE_LENGTH, MIN_PASSPHRASE_LENGTH, passphraseProblem } from "./backup-crypto-rules";

const MAGIC = Buffer.from("ARBK");
const VERSION = 1;
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const HEADER_LEN = MAGIC.length + 4 + SALT_LEN + IV_LEN; // 36
const MIN_FILE_LEN = HEADER_LEN + TAG_LEN;

// N = 2^15, r = 8, p = 1: about 32 MB of memory and a fraction of a second per guess for an attacker.
const SCRYPT_LOG_N = 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
// Never trust parameters read from a file blindly (a crafted file must not exhaust the server's memory).
const MAX_LOG_N = 20;
const MAX_R = 16;
const MAX_P = 4;

export { MIN_PASSPHRASE_LENGTH, MAX_PASSPHRASE_LENGTH, passphraseProblem };

function deriveKey(passphrase: string, salt: Buffer, logN: number, r: number, p: number): Buffer {
  // NFKC so the same passphrase typed on another keyboard or device derives the same key.
  return scryptSync(passphrase.normalize("NFKC"), salt, 32, { N: 2 ** logN, r, p, maxmem: 512 * 1024 * 1024 });
}

export function encryptBackup(data: Buffer, passphrase: string): Buffer {
  const problem = passphraseProblem(passphrase);
  if (problem) throw new Error(problem);
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const header = Buffer.concat([MAGIC, Buffer.from([VERSION, SCRYPT_LOG_N, SCRYPT_R, SCRYPT_P]), salt, iv]);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(passphrase, salt, SCRYPT_LOG_N, SCRYPT_R, SCRYPT_P), iv);
  cipher.setAAD(header);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([header, cipher.getAuthTag(), ciphertext]);
}

/** Throws one deliberately vague error for a wrong passphrase and for a damaged or tampered file. */
export function decryptBackup(blob: Buffer, passphrase: string): Buffer {
  const fail = () => new Error("Kata sandi salah atau berkas rusak.");
  if (blob.length < MIN_FILE_LEN || !blob.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Bukan berkas backup AR Corp.");
  if (blob[4] !== VERSION) throw new Error("Versi berkas backup tidak dikenal.");
  const logN = blob[5];
  const r = blob[6];
  const p = blob[7];
  if (logN < 10 || logN > MAX_LOG_N || r < 1 || r > MAX_R || p < 1 || p > MAX_P) throw fail();
  const header = blob.subarray(0, HEADER_LEN);
  const salt = blob.subarray(MAGIC.length + 4, MAGIC.length + 4 + SALT_LEN);
  const iv = blob.subarray(MAGIC.length + 4 + SALT_LEN, HEADER_LEN);
  const tag = blob.subarray(HEADER_LEN, HEADER_LEN + TAG_LEN);
  const ciphertext = blob.subarray(HEADER_LEN + TAG_LEN);
  try {
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(passphrase, salt, logN, r, p), iv);
    decipher.setAAD(header);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw fail();
  }
}
