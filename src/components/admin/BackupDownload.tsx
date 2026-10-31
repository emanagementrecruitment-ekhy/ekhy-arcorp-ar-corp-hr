"use client";

import { useState } from "react";
import { MIN_PASSPHRASE_LENGTH } from "@/lib/backup-crypto-rules";

/**
 * Downloads the encrypted database backup. The Owner types a passphrase here; it is sent once in the request body,
 * used to encrypt the file and never stored. Without it the backup cannot be opened, and nobody (including the
 * vendor) can recover it.
 */
export default function BackupDownload({ label = "Unduh backup terenkripsi", onDone }: { label?: string; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setOpen(false);
    setPass("");
    setPass2("");
    setError("");
  }

  async function download() {
    setError("");
    if (pass.length < MIN_PASSPHRASE_LENGTH) return setError(`Kata sandi minimal ${MIN_PASSPHRASE_LENGTH} karakter.`);
    if (pass !== pass2) return setError("Kata sandi dan pengulangannya tidak sama.");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase: pass }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Gagal membuat backup.");
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "arcorp-backup.db.enc";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      close();
      onDone?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat backup.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 py-2.5 px-4 rounded-[10px] border border-ar-goldline text-ar-gold text-[11.5px] font-semibold tracking-[0.08em] uppercase cursor-pointer"
      >
        🔒 {label}
      </button>
    );
  }

  return (
    <div className="max-w-sm rounded-2xl border border-ar-goldline bg-ar-surface2 p-4">
      <div className="text-[12.5px] font-semibold mb-1">Kata sandi backup</div>
      <div className="text-[11.5px] leading-[1.6] text-ar-dim mb-3">
        Backup dikunci dengan kata sandi ini. Kata sandi <strong>tidak disimpan di mana pun</strong>, jadi simpan sendiri di tempat
        aman. Bila hilang, backup tidak bisa dibuka oleh siapa pun.
      </div>
      <input
        type="password"
        autoComplete="new-password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        placeholder={`Kata sandi (minimal ${MIN_PASSPHRASE_LENGTH} karakter)`}
        className="w-full mb-2 py-2.5 px-3 bg-ar-input border border-ar-goldline rounded-[10px] text-[12.5px] text-ar-text"
      />
      <input
        type="password"
        autoComplete="new-password"
        value={pass2}
        onChange={(e) => setPass2(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !busy && download()}
        placeholder="Ulangi kata sandi"
        className="w-full py-2.5 px-3 bg-ar-input border border-ar-goldline rounded-[10px] text-[12.5px] text-ar-text"
      />
      <div className="min-h-[18px] mt-2 text-[11.5px] text-ar-red">{error}</div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={download}
          className="py-2 px-4 rounded-[10px] bg-ar-gold text-ar-ongold text-[11.5px] font-semibold disabled:opacity-60 cursor-pointer"
        >
          {busy ? "Membuat backup…" : "Unduh"}
        </button>
        <button type="button" disabled={busy} onClick={close} className="py-2 px-4 rounded-[10px] border border-ar-line text-[11.5px] text-ar-dim cursor-pointer">
          Batal
        </button>
      </div>
    </div>
  );
}
