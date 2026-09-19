"use client";

import { useEffect, useState } from "react";

// Web Push subscription keys are raw bytes, but Notification APIs only take
// base64url text — this is the standard conversion (see MDN's Push API guide).
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function subscribeToPush(vapidPublicKey: string) {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
}

/**
 * Silently (re-)subscribes when permission is already granted from a past
 * visit, and shows a small opt-in banner when the browser hasn't been asked
 * yet. Renders nothing once permission is denied — repeatedly nagging a
 * user who already said no just trains them to distrust the app.
 */
export default function PushSubscribe({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  // Lazy-initialized so it reads the real browser state on the client's own
  // first render, rather than triggering a setState-in-effect re-render.
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
    return Notification.permission;
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vapidPublicKey || permission !== "granted") return;
    subscribeToPush(vapidPublicKey).catch((err) => console.error("[push] silent resubscribe failed:", err));
  }, [vapidPublicKey, permission]);

  if (!vapidPublicKey || permission !== "default") return null;

  async function handleEnable() {
    setBusy(true);
    try {
      // Just flips permission state — the effect above does the actual
      // subscribe once it sees "granted", so there's one subscribe path
      // instead of two (this click handler duplicating the effect's work).
      setPermission(await Notification.requestPermission());
    } catch (err) {
      console.error("[push] enable failed:", err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-ar-surface2 border border-ar-goldline/40 rounded-xl px-3.5 py-2.5 mb-3 text-[11.5px]">
      <span className="text-ar-dim">Aktifkan notifikasi agar pengingat dari kantor pusat langsung masuk ke HP ini.</span>
      <button
        onClick={handleEnable}
        disabled={busy}
        className="shrink-0 py-1.5 px-3 rounded-lg bg-ar-goldfill text-ar-gold2 border border-ar-goldline text-[11px] cursor-pointer disabled:opacity-50"
      >
        {busy ? "..." : "Aktifkan"}
      </button>
    </div>
  );
}
