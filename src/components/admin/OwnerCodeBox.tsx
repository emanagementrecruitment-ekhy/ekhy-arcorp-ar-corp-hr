"use client";

import { useState } from "react";
import { btnPrimaryClass } from "@/components/ui/styles";

/**
 * Asks for the one-time code the Owner receives by email. Step 1 sends the code to the Owner's
 * inbox, step 2 takes the 6 digits. `onConfirm` returns an error message, or null on success.
 */
export default function OwnerCodeBox({
  title,
  hint,
  actionLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  hint: string;
  actionLabel: string;
  onConfirm: (code: string) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [sentTo, setSentTo] = useState<string[] | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function sendCode() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/owner-confirm/request", { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(d.error ?? "Gagal mengirim kode.");
        return;
      }
      setSentTo(d.sentTo ?? []);
      setDevCode(d.devCode);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setMsg("");
    try {
      const err = await onConfirm(code.trim());
      if (err) setMsg(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4.5 bg-ar-surface border border-ar-goldline rounded-2xl max-w-md">
      <div className="font-display text-[17px] text-ar-gold2 mb-1">🔒 {title}</div>
      <div className="text-[11.5px] text-ar-dim leading-[1.6] mb-3">{hint}</div>

      {sentTo === null ? (
        <button disabled={busy} onClick={sendCode} className={`${btnPrimaryClass} py-2.5 px-5`}>
          {busy ? "Mengirim…" : "Kirim kode ke email Owner"}
        </button>
      ) : (
        <>
          <div className="text-[11px] text-ar-green mb-2">
            Kode dikirim ke email Owner ({sentTo.join(", ")}). Minta kodenya dari Owner — berlaku 5 menit.
          </div>
          {devCode && <div className="text-[11px] text-ar-faint mb-2">Mode uji — kode: {devCode}</div>}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="6 digit kode"
            className="w-full py-2.5 px-3.5 mb-2.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[14px] tracking-[0.3em]"
          />
          <div className="flex gap-2 items-center">
            <button disabled={busy || code.length !== 6} onClick={confirm} className={`${btnPrimaryClass} py-2.5 px-5`}>
              {busy ? "Memeriksa…" : actionLabel}
            </button>
            <button disabled={busy} onClick={sendCode} className="text-[11px] text-ar-dim cursor-pointer">
              Kirim ulang
            </button>
          </div>
        </>
      )}

      {msg && <div className="mt-2.5 text-[11.5px] text-ar-red">{msg}</div>}
      {onCancel && (
        <button onClick={onCancel} className="mt-3 text-[11px] text-ar-dim cursor-pointer">
          Batal
        </button>
      )}
    </div>
  );
}
