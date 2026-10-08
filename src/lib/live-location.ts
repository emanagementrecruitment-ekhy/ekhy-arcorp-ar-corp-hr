/**
 * Periodic location pings from the employee app (see LiveLocationPing.tsx and
 * /api/attendance/ping). Pure helpers, kept free of Next/Prisma so they can be
 * unit-tested with `npm test`.
 */

/** The server ignores pings that arrive sooner than this after the previous one. */
export const MIN_PING_INTERVAL_MS = 30_000;
/** The client sends one ping this often while the app is open and visible. */
export const PING_INTERVAL_MS = 60_000;
/** Readings less precise than this (metres) are cell-tower guesses; do not use them. */
export const MAX_ACCURACY_M = 3000;

export interface Ping {
  lat: number;
  lng: number;
}

/** Validates an untrusted request body; null when it is not a usable ping. */
export function parsePing(body: unknown): Ping | null {
  if (typeof body !== "object" || body === null) return null;
  const { lat, lng, accuracy } = body as Record<string, unknown>;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy > MAX_ACCURACY_M) return null;
  return { lat, lng };
}

/** Rate limit: true when enough time has passed since the previous stored ping. */
export function shouldAcceptPing(liveAt: Date | null, now: Date, minIntervalMs = MIN_PING_INTERVAL_MS): boolean {
  if (!liveAt) return true;
  return now.getTime() - liveAt.getTime() >= minIntervalMs;
}

/** Which source holds the newest position: a periodic ping, the last login, or nothing yet. */
export function newestFix(loginAt: Date | null | undefined, liveAt: Date | null | undefined): "live" | "login" | "none" {
  if (liveAt && (!loginAt || liveAt.getTime() > loginAt.getTime())) return "live";
  if (loginAt) return "login";
  return "none";
}
