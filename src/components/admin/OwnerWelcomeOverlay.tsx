"use client";

import { useEffect, useState } from "react";

/**
 * One-time full-screen activation screen for the Owner's very first login
 * after Consultant generates/patenkan their identity — see
 * /api/owner-welcome. Mounted once in the admin layout; harmless no-op for
 * every accessRole other than OWNER, and for an Owner who's already seen it.
 */
export default function OwnerWelcomeOverlay() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    fetch("/api/owner-welcome")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.shouldShow) {
          setName(d.name ?? "");
          setShow(true);
        }
      })
      .catch(() => {});
  }, []);

  async function dismiss() {
    setDismissing(true);
    try {
      await fetch("/api/owner-welcome/seen", { method: "POST" });
    } finally {
      setShow(false);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] p-6">
      <div className="w-full h-full flex items-center justify-center bg-ar-bg-deep/95 ar-glow-corners ar-stars">
        <div className="ar-ring-gold max-w-[480px]">
          <div className="ar-frame-luxury bg-ar-surface rounded-[20px] px-8 py-9 text-center">
            <div className="text-[11px] tracking-[0.3em] uppercase text-ar-dim mb-4">Welcome &amp; Thanks For Join</div>
            <div className="text-[17px] leading-[1.8] text-ar-gold2 ar-shimmer-gold font-semibold">
              &quot;ARCorporation Onboarded &amp; Ready System
              <br />
              HR Unlocked : Owner {name}&quot;
            </div>
            <div className="ar-divider-ornate my-5">
              <span className="ar-divider-ornate-mark" />
            </div>
            <button
              disabled={dismissing}
              onClick={dismiss}
              className="py-3 px-7 ar-grad rounded-[11px] text-ar-ongold text-xs font-bold tracking-[0.18em] uppercase cursor-pointer disabled:opacity-60"
            >
              Mulai Kelola AR Corp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
