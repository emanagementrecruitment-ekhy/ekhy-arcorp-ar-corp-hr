import { usesVcr } from "./constants";

/**
 * Employee codes look like AR001 (staff) and EQ001 (Tera/terapis): PREFIX + three digits.
 * The prefixes belong to the client company, so every client runs the same code and only sets its own env
 * (NEXT_PUBLIC_CODE_PREFIX_STAFF / NEXT_PUBLIC_CODE_PREFIX_TERA, inlined at build time — set before Deploy), e.g.
 *   AR Corp: AR / EQ    Dear: DR / AM    Bintang: BT / AD
 * A prefix is 1–4 letters/digits; anything else falls back to the AR Corp default.
 */
export function cleanCodePrefix(raw: string | undefined, fallback: string): string {
  const v = (raw ?? "").trim().toUpperCase();
  return /^[A-Z0-9]{1,4}$/.test(v) ? v : fallback;
}

export const STAFF_CODE_PREFIX = cleanCodePrefix(process.env.NEXT_PUBLIC_CODE_PREFIX_STAFF, "AR");
export const TERA_CODE_PREFIX = cleanCodePrefix(process.env.NEXT_PUBLIC_CODE_PREFIX_TERA, "EQ");

export function codePrefixForRole(role: string): string {
  return usesVcr(role) ? TERA_CODE_PREFIX : STAFF_CODE_PREFIX;
}

/**
 * Next free number for `prefix`, looking only at codes shaped exactly "PREFIX<digits>" or the older
 * "PREFIX-<digits>" (existing employees keep their old code, but still count so numbers never collide).
 */
export const FIRST_CODE_NUMBER = 3; // numbering starts at 003 (001 and 002 stay reserved)

export function nextCodeNumber(codes: string[], prefix: string): number {
  const re = new RegExp(`^${prefix}-?(\\d+)$`);
  let max = 0;
  for (const c of codes) {
    const m = re.exec(c);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return Math.max(max + 1, FIRST_CODE_NUMBER);
}

export function formatCode(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(3, "0")}`;
}

/** Example code for UI hints and import templates, e.g. exampleCode("staff", 7) -> "AR007". */
export function exampleCode(kind: "staff" | "tera", n = FIRST_CODE_NUMBER): string {
  return formatCode(kind === "tera" ? TERA_CODE_PREFIX : STAFF_CODE_PREFIX, n);
}
