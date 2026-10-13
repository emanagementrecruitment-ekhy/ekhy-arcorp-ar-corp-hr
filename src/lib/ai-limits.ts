// Pure rules for Ara's daily Claude allowance, so they can be unit tested. The counting itself lives in ai-usage.ts.

export const DEFAULT_GLOBAL_DAILY = 300; // Claude questions per day, whole app
export const DEFAULT_PER_USER_DAILY = 20; // per employee; the office gets ADMIN_MULTIPLIER times as many
export const ADMIN_MULTIPLIER = 3;

/** A whole number >= 0 ("0" switches Claude off); anything else (empty, negative, text) uses the default. */
export function parseLimit(raw: string | undefined | null, fallback: number): number {
  if (raw === undefined || raw === null || raw.trim() === "") return fallback;
  const n = Number(raw.trim());
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

export interface AiLimits {
  global: number;
  perUser: number;
  perAdmin: number;
}

export function aiLimitsFromEnv(env: Record<string, string | undefined>): AiLimits {
  const perUser = parseLimit(env.ASSISTANT_AI_PER_USER_LIMIT, DEFAULT_PER_USER_DAILY);
  return {
    global: parseLimit(env.ASSISTANT_AI_DAILY_LIMIT, DEFAULT_GLOBAL_DAILY),
    perUser,
    perAdmin: perUser * ADMIN_MULTIPLIER,
  };
}

export type AiGate = { ok: true } | { ok: false; reason: "user" | "global" };

/** The friendly line appended to a rule-based answer when Claude is not available today. */
export function limitNotice(reason: "user" | "global"): string {
  return reason === "user"
    ? "Batas pertanyaan bebas ke AI untuk hari ini sudah tercapai, jadi saya hanya bisa menjawab pertanyaan umum (absen, VCR, Slip Pay, kasbon). Pertanyaan bebas bisa dicoba lagi besok."
    : "Pertanyaan bebas ke AI hari ini sudah mencapai batas harian, jadi saya hanya bisa menjawab pertanyaan umum (absen, VCR, Slip Pay, kasbon). Coba lagi besok atau hubungi Call Center.";
}
