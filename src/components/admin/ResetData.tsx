"use client";

import { useState } from "react";

/**
 * Owner-only "kembalikan semua data ke nol". Needs the developer's reset code (same RESET_PASSCODE as the
 * appearance reset) and the word RESET typed in, because it cannot be undone.
 */
export default function ResetData() {
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [removeSeatHolders, setRemoveSeatHolders] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const ready = code.trim() !== "" && confirm.trim() === "RESET" && !busy;

  async function reset() {
    if (!ready) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/system/reset-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), confirm: confirm.trim(), removeSeatHolders }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal mereset data.");
        return;
      }
      setMsg(`✓ Data kembali ke nol: ${data.employeesRemoved} Tera/karyawan dihapus. Memuat ulang…`);
      setCode("");
      setConfirm("");
      setTimeout(() => window.location.reload(), 1200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-ar-line">
      <div className="font-display text-[19px] text-ar-red mb-1">Reset Data ke Nol</div>
      <div className="text-[11.5px] text-ar-dim leading-[1.7] mb-3 max-w-xl">
        Menghapus semua Tera dan karyawan (kecuali Grace untuk demo) beserta seluruh pendapatan, kasbon, absensi, chat,
        slip pay, tabungan, dan arsip resign. Akun Owner, pengaturan tampilan, paket, dan Riwayat Aktivitas tetap ada.
        Tidak bisa dibatalkan — unduh backup di Status Sistem lebih dulu. Perlu kode dari vendor/penyedia aplikasi.
      </div>
      <label className="flex items-start gap-2 text-[11.5px] text-ar-dim mb-3 max-w-xl cursor-pointer">
        <input type="checkbox" checked={removeSeatHolders} onChange={(e) => setRemoveSeatHolders(e.target.checked)} className="mt-0.5" />
        <span>
          Hapus juga pemegang jabatan (Admin Pusat, Kepala Mess, Manager). Bila tidak dicentang, akun mereka tetap ada agar
          bisa login, hanya riwayat transaksinya yang dikosongkan.
        </span>
      </label>
      <div className="flex flex-wrap gap-2 max-w-xl">
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Kode reset"
          className="flex-1 min-w-[160px] py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
        />
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && reset()}
          placeholder="Ketik RESET"
          className="flex-1 min-w-[140px] py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
        />
        <button
          disabled={!ready}
          onClick={reset}
          className="py-2.5 px-4 bg-ar-surface2 border border-ar-red/60 rounded-[9px] text-ar-red text-[11px] font-semibold tracking-[0.1em] uppercase cursor-pointer disabled:opacity-40"
        >
          {busy ? "Mereset…" : "Reset Data"}
        </button>
      </div>
      {error && <div className="text-[11.5px] text-ar-red mt-2">{error}</div>}
      {msg && <div className="text-[11.5px] text-ar-green mt-2">{msg}</div>}
    </div>
  );
}
