"use client";

import { useState } from "react";

/**
 * The Android app is a thin TWA wrapper around this live website — every
 * feature/UI change ships the moment it's deployed, no APK reinstall needed.
 * This button exists only for the rare case a phone is stuck showing a
 * stale cached page: it clears any Cache Storage entries and forces a fresh
 * network reload of the current page.
 */
export default function RefreshAppButton({
  className,
  label = "🔄 Segarkan Tampilan",
}: {
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // Cache Storage unsupported/blocked — the cache-busting reload below still helps.
    }
    const url = new URL(window.location.href);
    url.searchParams.set("_refresh", Date.now().toString());
    window.location.replace(url.toString());
  }

  return (
    <button onClick={refresh} disabled={busy} className={className}>
      {busy ? "Menyegarkan…" : label}
    </button>
  );
}
