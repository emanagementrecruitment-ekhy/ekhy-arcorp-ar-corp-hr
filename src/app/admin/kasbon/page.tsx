"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Badge from "@/components/Badge";

interface KasbonRow {
  id: string;
  name: string;
  code: string;
  reason: string;
  amount: number;
  amountLabel: string;
  status: string;
  pending: boolean;
  decided: boolean;
  dateLabel: string;
}

export default function AdminKasbonPage() {
  const [rows, setRows] = useState<KasbonRow[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});

  function load() {
    fetch("/api/admin/kasbon")
      .then((r) => r.json())
      .then((d) => setRows(d.kasbon ?? []));
  }

  useEffect(() => {
    load();
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setIsOwner(d.session?.accessRole === "OWNER"));
  }, []);

  async function decide(k: KasbonRow, approve: boolean) {
    setBusyId(k.id);
    try {
      const editedAmount = Number(editAmounts[k.id]);
      const res = await fetch(`/api/admin/kasbon/${k.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approve,
          ...(approve && Number.isFinite(editedAmount) && editedAmount > 0 ? { amount: editedAmount } : {}),
        }),
      });
      if (res.ok) load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <AdminPageHeader title="Persetujuan Kasbon" subtitle="Hanya Owner yang dapat menyetujui atau menolak" />

      <div className="pt-5.5 flex flex-col gap-2.5">
        {rows.length === 0 && <div className="text-[12px] text-ar-faint py-3">Belum ada pengajuan kasbon.</div>}
        {rows.map((k) => (
          <div
            key={k.id}
            className="p-4.5 bg-ar-surface border border-ar-line rounded-2xl flex flex-wrap gap-4.5 items-center justify-between"
          >
            <div className="min-w-[210px]">
              <div className="text-[13.5px]">{k.name}</div>
              <div className="text-[10.5px] text-ar-dim mt-1">
                {k.code} · {k.dateLabel}
              </div>
            </div>
            <div className="flex-1 min-w-[220px] text-xs leading-[1.6] text-ar-dim">{k.reason}</div>
            {k.pending && isOwner ? (
              <div className="min-w-[150px]">
                <label className="text-[9.5px] tracking-[0.12em] uppercase text-ar-dim mb-1 block">
                  Nominal (bisa diubah)
                </label>
                <input
                  type="number"
                  value={editAmounts[k.id] ?? String(k.amount)}
                  onChange={(e) => setEditAmounts((m) => ({ ...m, [k.id]: e.target.value }))}
                  className="w-full py-2 px-3 bg-ar-input border border-ar-goldline rounded-[9px] text-ar-gold2 font-display text-[17px]"
                />
              </div>
            ) : (
              <div className="font-display text-2xl text-ar-gold2 min-w-[130px]">{k.amountLabel}</div>
            )}
            <div className="flex gap-2 items-center min-w-[230px] justify-end">
              {k.pending ? (
                isOwner ? (
                  <span className="flex gap-2">
                    <button
                      disabled={busyId === k.id}
                      onClick={() => decide(k, true)}
                      className="py-2.5 px-4 ar-grad rounded-[9px] text-ar-ongold text-[10.5px] font-bold tracking-[0.12em] uppercase cursor-pointer disabled:opacity-60"
                    >
                      Setujui
                    </button>
                    <button
                      disabled={busyId === k.id}
                      onClick={() => decide(k, false)}
                      className="py-2.5 px-4 bg-transparent border border-[rgba(228,117,107,.4)] rounded-[9px] text-ar-red text-[10.5px] font-semibold tracking-[0.12em] uppercase cursor-pointer disabled:opacity-60"
                    >
                      Tolak
                    </button>
                  </span>
                ) : (
                  <Badge status={k.status} />
                )
              ) : (
                <Badge status={k.status} />
              )}
            </div>
          </div>
        ))}
        <div className="mt-1.5 py-4 px-4.5 bg-ar-surface2 border border-ar-line rounded-2xl text-[11.5px] leading-[1.75] text-ar-dim">
          Setiap keputusan tercatat dengan nama pemberi persetujuan dan waktunya. Owner bisa mengubah nominal sebelum
          menyetujui. Nominal yang disetujui otomatis dipotong dari pencairan voucher berikutnya.
        </div>
      </div>
    </div>
  );
}
