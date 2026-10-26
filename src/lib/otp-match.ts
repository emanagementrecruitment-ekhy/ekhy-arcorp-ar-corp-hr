import bcrypt from "bcryptjs";

export type OtpCandidate = { id: string; codeHash: string; expiresAt: Date; attempts: number };

export type OtpMatch =
  | { ok: true; matchedId: string; openIds: string[] }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "mismatch"; openIds: string[] };

/**
 * Checks a submitted code against every still-live code issued to the same
 * employee (newest first), not just the latest. A double-tapped "send code"
 * issues two codes and two emails; checking only the newest would reject the
 * code from the email the person happened to read first.
 */
export async function matchOtp(code: string, candidates: OtpCandidate[], maxAttempts: number, now = Date.now()): Promise<OtpMatch> {
  if (candidates.length === 0) return { ok: false, reason: "not_found", openIds: [] };
  const live = candidates.filter((c) => c.expiresAt.getTime() >= now);
  if (live.length === 0) return { ok: false, reason: "expired", openIds: [] };
  const open = live.filter((c) => c.attempts < maxAttempts);
  if (open.length === 0) return { ok: false, reason: "too_many_attempts", openIds: [] };
  const openIds = open.map((c) => c.id);
  for (const c of open) {
    if (await bcrypt.compare(code, c.codeHash)) return { ok: true, matchedId: c.id, openIds };
  }
  return { ok: false, reason: "mismatch", openIds };
}

/**
 * In production a code that could not be delivered must not be written to the
 * logs (anyone with log access could log in as that user). Local/dev and the
 * offline desktop build, where the log or screen is the only channel, keep it.
 */
export function mayLogOtpCode(env: { NODE_ENV?: string; ARCORP_LOCAL_MODE?: string }): boolean {
  return env.NODE_ENV !== "production" || env.ARCORP_LOCAL_MODE === "1";
}
