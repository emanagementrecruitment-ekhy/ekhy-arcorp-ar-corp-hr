"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";

/**
 * The Android app is a thin TWA wrapper around this live website — every
 * feature/UI change ships the moment it's deployed, no APK reinstall needed.
 * This button exists only for the rare case a phone is stuck showing a
 * stale cached page: it clears any Cache Storage entries and forces a fresh
 * network reload of the current page.
 */
export default function RefreshAppButton({
  className,
  label = "Segarkan Tampilan",
  iconOnly = false,
}: {
  className?: string;
  label?: string;
  /** Round icon button for headers (no text). */
  iconOnly?: boolean;
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

  if (iconOnly) {
    return (
      <button
        onClick={refresh}
        disabled={busy}
        title="Segarkan tampilan"
        aria-label="Segarkan tampilan"
        className={
          className ??
          "w-9 h-9 grid place-items-center rounded-full bg-ar-surface2 border border-ar-line text-ar-dim cursor-pointer transition-colors hover:text-ar-text active:scale-95 disabled:opacity-60"
        }
      >
        <Icon name="refresh" className={`w-[17px] h-[17px] ${busy ? "animate-spin" : ""}`} />
      </button>
    );
  }

  return (
    <button onClick={refresh} disabled={busy} className={className}>
      {busy ? "Menyegarkan…" : label}
    </button>
  );
}
