"use client";

import { useEffect, useState } from "react";

interface PackageStatus {
  licensingConfigured: boolean;
  employeeLimit: number | null;
  currentCount: number;
}

function limitLabel(limit: number | null): string {
  return limit === null ? "Unlimited" : `${limit} karyawan/Tera`;
}

/**
 * Package tier status for white-label deployments (see src/lib/license.ts) —
 * shows the current employee/Tera cap and lets Owner/Consultant redeem a
 * one-time upgrade code from the vendor to raise it. Renders nothing at all
 * when licensing isn't configured for this deployment (e.g. the vendor's own
 * reference instance), matching the opt-in pattern used everywhere else.
 */
export default function PackagePanel() {
  const [data, setData] = useState<PackageStatus | null>(null);
  const [entering, setEntering] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function load() {
    fetch("/api/admin/license-upgrade")
      .then((r) => r.json())
      .then(setData);
  }

  useEffect(load, []);

  async function submit() {
    if (!code.trim()) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/license-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(d.error ?? "Gagal memvalidasi kode.");
        return;
      }
      setEntering(false);
      setCode("");
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!data || !data.licensingConfigured) return null;

  const atLimit = data.employeeLimit !== null && data.currentCount >= data.employeeLimit;

  return (
    <div className="p-4 mb-6 bg-ar-surface border border-ar-goldline rounded-2xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9.5px] tracking-[0.16em] uppercase text-ar-dim">Paket Berlangganan</div>
          <div className="font-display text-[17px] text-ar-gold2 mt-0.5">{limitLabel(data.employeeLimit)}</div>
          <div className="text-[10.5px] text-ar-dim mt-0.5">
            {data.currentCount} karyawan/Tera terpakai
            {data.employeeLimit !== null && ` dari ${data.employeeLimit}`}
          </div>
        </div>
        {!entering && (
          <button
            onClick={() => setEntering(true)}
            className="shrink-0 py-2 px-3.5 bg-ar-surface2 border border-ar-line rounded-[9px] text-ar-gold text-[11px] cursor-pointer"
          >
            Masukkan Kode Upgrade
          </button>
        )}
      </div>

      {atLimit && !entering && (
        <div className="mt-3 text-[11px] text-ar-red leading-[1.6]">
          Batas paket sudah tercapai — tambah karyawan/Tera baru diblokir sampai paket di-upgrade. Hubungi vendor untuk kode upgrade.
        </div>
      )}

      {entering && (
        <div className="mt-3.5 pt-3.5 border-t border-ar-line grid gap-2.5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Kode Upgrade dari Vendor"
            className="w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px] font-mono tracking-[0.08em]"
          />
          {msg && <div className="text-[11.5px] text-ar-red">{msg}</div>}
          <div className="flex gap-2.5">
            <button
              disabled={busy}
              onClick={submit}
              className="py-2.5 px-4 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60"
            >
              Terapkan Kode
            </button>
            <button
              onClick={() => {
                setEntering(false);
                setMsg("");
              }}
              className="py-2.5 px-4 bg-ar-surface2 border border-ar-line rounded-[10px] text-ar-dim text-[11px] cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
