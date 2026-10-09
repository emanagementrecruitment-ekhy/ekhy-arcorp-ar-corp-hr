"use client";

import { cachedJson } from "@/lib/client-cache";
import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import Badge from "@/components/Badge";
import { cardCompactClass } from "@/components/ui/styles";
import { KASBON_KINDS, KASBON_KIND_LABEL, type KasbonKind } from "@/lib/kasbon-kind";

interface KasbonRow {
  id: string;
  name: string;
  code: string;
  reason: string;
  amount: number;
  amountLabel: string;
  status: string;
  kind: KasbonKind;
  pending: boolean;
  decided: boolean;
  approved: boolean;
  awaitingTransfer: boolean;
  transferredLabel: string;
  dateLabel: string;
}

export default function AdminKasbonPage() {
  const [rows, setRows] = useState<KasbonRow[]>([]);
  const [canApprove, setCanApprove] = useState(false);
  const [canTransfer, setCanTransfer] = useState(false);
  const [kind, setKind] = useState<KasbonKind>("KARYAWAN");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});

  function load() {
    fetch("/api/admin/kasbon")
      .then((r) => r.json())
      .then((d) => setRows(d.kasbon ?? []));
  }

  useEffect(() => {
    load();
    cachedJson("/api/auth/session")
      .then((d) => {
        const role = d.session?.accessRole;
        setCanApprove(["OWNER", "CONSULTANT", "MANAGER"].includes(role));
        setCanTransfer(["ADMIN_PUSAT", "OWNER", "CONSULTANT", "MANAGER"].includes(role));
      });
  }, []);

  async function markTransferred(k: KasbonRow) {
    setBusyId(k.id);
    try {
      const res = await fetch(`/api/admin/kasbon/${k.id}/transfer`, { method: "POST" });
      if (res.ok) load();
    } finally {
      setBusyId(null);
    }
  }

  const shown = rows.filter((r) => r.kind === kind);

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
      <AdminPageHeader
        title="Persetujuan Kasbon"
        subtitle="Owner dan Manager yang menyetujui — Admin hanya mentransfer setelah disetujui"
      />

      <div className="pt-5.5 flex gap-1.5 p-[5px] bg-ar-surface2 rounded-[11px] w-fit max-w-full overflow-x-auto">
        {KASBON_KINDS.map((k) => {
          const total = rows.filter((r) => r.kind === k);
          const waiting = total.filter((r) => r.pending || r.awaitingTransfer).length;
          return (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`py-2.5 px-4 rounded-lg text-[11px] font-semibold tracking-[0.14em] uppercase cursor-pointer whitespace-nowrap ${
                kind === k ? "bg-ar-goldfill text-ar-gold2 shadow-[inset_0_0_0_1px_var(--ar-goldline)]" : "text-ar-dim"
              }`}
            >
              {KASBON_KIND_LABEL[k]}
              {waiting > 0 && <span className="ml-1.5 text-ar-red">({waiting})</span>}
            </button>
          );
        })}
      </div>

      <div className="pt-4 flex flex-col gap-2.5">
        {shown.length === 0 && (
          <div className="text-[12px] text-ar-faint py-3">
            {kind === "CHANNEL"
              ? "Belum ada pengajuan kasbon Channel/Link. Kelompok ini aktif setelah daftar Channel/Link ditetapkan."
              : `Belum ada pengajuan kasbon ${KASBON_KIND_LABEL[kind].toLowerCase()}.`}
          </div>
        )}
        {shown.map((k) => (
          <div
            key={k.id}
            className={`${cardCompactClass} flex flex-wrap gap-4.5 items-center justify-between`}
          >
            <div className="min-w-[210px]">
              <div className="text-[13.5px]">{k.name}</div>
              <div className="text-[10.5px] text-ar-dim mt-1">
                {k.code} · {k.dateLabel}
              </div>
            </div>
            <div className="flex-1 min-w-[220px] text-xs leading-[1.6] text-ar-dim">{k.reason}</div>
            {k.pending && canApprove ? (
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
                canApprove ? (
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
                <span className="flex flex-col items-end gap-1.5">
                  <Badge status={k.status} />
                  {k.approved && k.transferredLabel && <span className="text-[10.5px] text-ar-green text-right">{k.transferredLabel}</span>}
                  {k.awaitingTransfer && (
                    canTransfer ? (
                      <button
                        disabled={busyId === k.id}
                        onClick={() => markTransferred(k)}
                        className="py-2 px-3.5 ar-grad rounded-[9px] text-ar-ongold text-[10.5px] font-bold tracking-[0.1em] uppercase cursor-pointer disabled:opacity-60"
                      >
                        Tandai Sudah Ditransfer
                      </button>
                    ) : (
                      <span className="text-[10.5px] text-ar-dim">Menunggu transfer Admin</span>
                    )
                  )}
                </span>
              )}
            </div>
          </div>
        ))}
        <div className="mt-1.5 py-4 px-4.5 bg-ar-surface2 border border-ar-line rounded-2xl text-[11.5px] leading-[1.75] text-ar-dim">
          Setiap keputusan tercatat dengan nama pemberi persetujuan dan waktunya. Owner atau Manager bisa mengubah
          nominal sebelum menyetujui. Admin baru boleh mentransfer setelah kasbon disetujui, lalu menandainya
          &quot;Sudah Ditransfer&quot;. Nominal yang disetujui otomatis dipotong dari pencairan voucher berikutnya.
        </div>
      </div>
    </div>
  );
}
