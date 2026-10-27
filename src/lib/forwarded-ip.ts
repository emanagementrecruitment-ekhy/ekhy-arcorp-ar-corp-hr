/**
 * Picks the client IP from an x-forwarded-for value. Railway's proxy appends the address it saw to
 * the END of the list; anything before that was supplied by the caller and can be forged, so the
 * last entry is the only trustworthy one.
 */
export function ipFromForwardedFor(fwd: string | null): string | null {
  if (!fwd) return null;
  const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : null;
}
