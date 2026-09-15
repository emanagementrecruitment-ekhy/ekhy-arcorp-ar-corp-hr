"use client";

import { useEffect, useState } from "react";

interface SyncResult {
  sent: number;
  failed: number;
  remaining: number;
  failedDetails: Array<{ method: string; url: string; error: string }>;
  cancelled?: boolean;
}

interface ArcorpDesktopBridge {
  getMode: () => Promise<"online" | "offline" | "checking">;
  syncNow: () => Promise<SyncResult>;
  openSlipFolder: () => Promise<void>;
  onReconnected: (cb: () => void) => () => void;
}

declare global {
  interface Window {
    arcorpDesktop?: ArcorpDesktopBridge;
  }
}

/**
 * Only ever renders inside the AR Corp Desktop wrapper app (see /desktop) —
 * a plain no-op on the regular web app, since window.arcorpDesktop simply
 * doesn't exist there. Shows the current Online/Offline mode and, once the
 * desktop app detects the office is back online, a "Sinkron Sekarang"
 * button to push whatever was entered locally while offline.
 */
export default function DesktopStatusBar() {
  const [mode, setMode] = useState<"online" | "offline" | "checking" | null>(null);
  const [reconnected, setReconnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    const bridge = window.arcorpDesktop;
    if (!bridge) return;
    bridge.getMode().then(setMode);
    const off = bridge.onReconnected(() => setReconnected(true));
    return off;
  }, []);

  if (!mode) return null;

  async function sync() {
    if (!window.arcorpDesktop) return;
    setSyncing(true);
    setResult(null);
    try {
      const r = await window.arcorpDesktop.syncNow();
      setResult(r);
      if (!r.cancelled) setReconnected(false);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="fixed bottom-3 right-3 z-[90] flex flex-col items-end gap-2">
      {reconnected && mode === "offline" && (
        <div className="bg-ar-surface border border-ar-goldline rounded-xl px-4 py-3 shadow-lg max-w-[280px]">
          <div className="text-[11px] text-ar-gold2 font-semibold mb-1">Internet tersambung kembali</div>
          <div className="text-[10.5px] text-ar-dim mb-2.5">
            Kirim data yang diinput selama offline ke server, lalu login online untuk konfirmasi.
          </div>
          <button
            disabled={syncing}
            onClick={sync}
            className="w-full py-2 ar-grad rounded-[8px] text-ar-ongold text-[10.5px] font-bold tracking-[0.12em] uppercase cursor-pointer disabled:opacity-60"
          >
            {syncing ? "Menyinkron…" : "Sinkron Sekarang"}
          </button>
        </div>
      )}
      {result && !result.cancelled && (
        <div className="bg-ar-surface border border-ar-goldline rounded-xl px-4 py-3 shadow-lg max-w-[280px] text-[10.5px] text-ar-dim">
          {result.sent} data terkirim{result.failed > 0 ? `, ${result.failed} gagal (tetap tersimpan, coba sinkron lagi nanti).` : "."}
        </div>
      )}
      <div
        className={`px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-[0.1em] uppercase border ${
          mode === "online"
            ? "bg-emerald-950/60 border-emerald-700 text-emerald-400"
            : "bg-amber-950/60 border-amber-700 text-amber-400"
        }`}
      >
        {mode === "online" ? "● Online (Railway)" : "● Offline (Lokal)"}
      </div>
    </div>
  );
}
