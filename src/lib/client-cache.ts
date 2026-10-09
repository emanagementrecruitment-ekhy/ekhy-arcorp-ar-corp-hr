/**
 * Tiny browser-side cache for small GET endpoints that every admin page asks for again after each
 * menu click (who am I, the "N aktif" badge, the name list for pickers). Each extra request costs a
 * full network round trip to the server, which is what makes moving between menus feel slow, so
 * repeats within `ttlMs` reuse the previous answer, and parallel callers share one request.
 */
const entries = new Map<string, { at: number; value: Promise<unknown> }>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- callers read loosely-typed JSON just like fetch().then(r => r.json())
export function cachedJson<T = any>(url: string, ttlMs = 20_000): Promise<T> {
  const hit = entries.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = fetch(url)
    .then((r) => r.json())
    .catch((e) => {
      // Never keep a failed request around — the next call should try again.
      entries.delete(url);
      throw e;
    });
  entries.set(url, { at: Date.now(), value });
  return value as Promise<T>;
}

/** Forget cached answers (all, or one url) — call after an action that changes what they return. */
export function clearCachedJson(url?: string) {
  if (url) entries.delete(url);
  else entries.clear();
}
