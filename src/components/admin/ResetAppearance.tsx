"use client";

import { useState } from "react";

/**
 * Password-gated "reset appearance to AR Corp default" control. Deliberately
 * lives here (Nav Layout Preview / dev) instead of Pengaturan Tampilan —
 * anyone with office access can open this page, but the code itself is held
 * by the Consultant, so using it still means asking them first.
 */
export default function ResetAppearance() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function reset() {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/settings/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mereset.");
        return;
      }
      setMsg("✓ Direset ke tampilan bawaan AR Corp — memuat ulang…");
      setCode("");
      setTimeout(() => window.location.reload(), 800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-ar-line">
      <div className="font-display text-[19px] text-ar-gold2 mb-1">Reset Tampilan ke Bawaan</div>
      <div className="text-[11.5px] text-ar-dim leading-[1.6] mb-3 max-w-xl">
        Mengembalikan warna, font, dan logo dashboard ke bawaan AR Corp. Perlu kode khusus — hubungi vendor/penyedia
        aplikasi sebelum memakai tombol ini.
      </div>
      <div className="flex flex-wrap gap-2 max-w-md">
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && reset()}
          placeholder="Kode reset"
          className="flex-1 min-w-[180px] py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
        />
        <button
          disabled={busy || !code.trim()}
          onClick={reset}
          className="py-2.5 px-4 bg-ar-surface2 border border-ar-line rounded-[9px] text-ar-dim text-[11px] font-semibold tracking-[0.1em] uppercase cursor-pointer disabled:opacity-50"
        >
          {busy ? "Mereset…" : "Reset"}
        </button>
      </div>
      {error && <div className="text-[11.5px] text-ar-red mt-2">{error}</div>}
      {msg && <div className="text-[11.5px] text-ar-green mt-2">{msg}</div>}
    </div>
  );
}
