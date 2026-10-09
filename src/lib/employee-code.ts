import { usesVcr } from "./constants";

/** Employee/staff codes start with AR, Tera (terapis) codes start with EQ. */
export const STAFF_CODE_PREFIX = "AR";
export const TERA_CODE_PREFIX = "EQ";

export function codePrefixForRole(role: string): string {
  return usesVcr(role) ? TERA_CODE_PREFIX : STAFF_CODE_PREFIX;
}

/** Next free number for `prefix`, looking only at codes shaped exactly "PREFIX-<digits>". */
export function nextCodeNumber(codes: string[], prefix: string): number {
  const re = new RegExp(`^${prefix}-(\\d+)$`);
  let max = 0;
  for (const c of codes) {
    const m = re.exec(c);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

export function formatCode(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(2, "0")}`;
}
