// Passphrase rules for the encrypted backup. Kept apart from backup-crypto.ts (which uses node:crypto) so the browser
// form and the server check use exactly the same rules without pulling server code into the page.

export const MIN_PASSPHRASE_LENGTH = 12;
export const MAX_PASSPHRASE_LENGTH = 200;

/** Returns a message for the user when the passphrase is not acceptable, or null when it is fine. */
export function passphraseProblem(passphrase: unknown): string | null {
  if (typeof passphrase !== "string") return "Kata sandi wajib diisi.";
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) return `Kata sandi minimal ${MIN_PASSPHRASE_LENGTH} karakter.`;
  if (passphrase.length > MAX_PASSPHRASE_LENGTH) return `Kata sandi maksimal ${MAX_PASSPHRASE_LENGTH} karakter.`;
  if (new Set(passphrase).size < 5) return "Kata sandi terlalu mudah ditebak: pakai lebih banyak karakter yang berbeda.";
  return null;
}
