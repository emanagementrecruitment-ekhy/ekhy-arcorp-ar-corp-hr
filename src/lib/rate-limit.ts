import "server-only";

/**
 * In-memory sliding-window limiter — good enough for a single Railway
 * container (this app doesn't run as multiple instances/edge functions).
 * Keyed by whatever the caller passes (e.g. "otp-request:<ip>" or
 * "otp-request:<identifier>"), so the same helper covers both per-IP and
 * per-account limits.
 */
const hits = new Map<string, number[]>();

// Sweep occasionally so the map doesn't grow forever across many distinct keys.
let lastSweep = Date.now();
function sweep(windowMs: number) {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, timestamps] of hits) {
    const kept = timestamps.filter((t) => now - t < windowMs);
    if (kept.length === 0) hits.delete(key);
    else hits.set(key, kept);
  }
}

/** Returns true if this key is still within its allowance; otherwise records nothing further and returns false. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  sweep(windowMs);
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= limit) {
    hits.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  hits.set(key, timestamps);
  return true;
}

/** Best-effort client IP from proxy headers (Railway sits behind one) — falls back to a constant so unknown callers still share one bucket instead of bypassing the limit entirely. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
