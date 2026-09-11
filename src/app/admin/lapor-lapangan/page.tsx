"use client";

import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

interface Thread {
  id: string;
  name: string;
  code: string;
  place: string;
  lastText: string;
  lastTime: string;
}

interface ThreadDetail {
  employee: { id: string; name: string; code: string; place: string };
  messages: { id: string; fromSupervisor: boolean; text: string; time: string }[];
}

export default function LaporLapanganPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [canReply, setCanReply] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  function loadThreads() {
    fetch("/api/admin/lapor")
      .then((r) => r.json())
      .then((d) => setThreads(d.threads ?? []));
  }

  function loadDetail(id: string) {
    fetch(`/api/admin/lapor?employeeId=${id}`)
      .then((r) => r.json())
      .then(setDetail);
  }

  useEffect(() => {
    loadThreads();
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setCanReply(["OWNER", "CONSULTANT", "SUPERVISOR"].includes(d.session?.accessRole)));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadDetail(selectedId);
  }, [selectedId]);

  async function sendReply() {
    const text = draft.trim();
    if (!text || !selectedId || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/lapor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: selectedId, text }),
      });
      if (res.ok) {
        setDraft("");
        loadDetail(selectedId);
        loadThreads();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Laporan Lapangan"
        subtitle={canReply ? "Riwayat lapor karyawan — bisa dibalas dari sini" : "Riwayat lapor karyawan ke supervisor lapangan — akses lihat saja"}
      />

      <div className="grid grid-cols-1 lg:[grid-template-columns:320px_minmax(0,1fr)] gap-4 pt-5.5">
        <div className="flex flex-col gap-2">
          {threads.length === 0 && (
            <div className="p-4 bg-ar-surface border border-ar-line rounded-2xl text-[12px] text-ar-faint">
              Belum ada laporan dari karyawan lapangan.
            </div>
          )}
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`text-left p-3.5 rounded-[13px] border cursor-pointer ${
                selectedId === t.id ? "bg-ar-goldfill border-ar-goldline" : "bg-ar-surface border-ar-line"
              }`}
            >
              <div className="flex justify-between gap-2 items-center">
                <span className="text-[13px]">{t.name}</span>
                <span className="text-[10px] text-ar-dim">{t.lastTime}</span>
              </div>
              <div className="text-[10.5px] text-ar-dim mt-1">
                {t.code} · {t.place}
              </div>
              <div className="text-[11.5px] text-ar-faint mt-1.5 truncate">{t.lastText}</div>
            </button>
          ))}
        </div>

        <div className="p-5 bg-ar-surface border border-ar-line rounded-2xl min-h-[300px]">
          {!detail && <div className="text-[12.5px] text-ar-faint">Pilih karyawan di sebelah kiri untuk lihat laporannya.</div>}
          {detail && (
            <>
              <div className="pb-3.5 mb-3.5 border-b border-ar-line">
                <div className="font-display text-[19px] text-ar-gold2">{detail.employee.name}</div>
                <div className="text-[11px] text-ar-dim mt-1">
                  {detail.employee.code} · {detail.employee.place}
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {detail.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.fromSupervisor ? "justify-start" : "justify-end"}`}>
                    <span
                      className={`inline-block max-w-[80%] py-2.5 px-3.5 rounded-2xl text-[13px] ${
                        m.fromSupervisor ? "bg-ar-surface2 text-ar-text rounded-bl-sm" : "bg-ar-goldfill text-ar-text rounded-br-sm"
                      }`}
                    >
                      <span className="block">{m.text}</span>
                      <span className="block text-[9.5px] opacity-60 mt-1">{m.time}</span>
                    </span>
                  </div>
                ))}
              </div>

              {canReply && (
                <div className="flex gap-2 mt-4">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendReply()}
                    placeholder="Balas laporan…"
                    className="flex-1 min-w-0 py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[11px] text-ar-text text-[13px]"
                  />
                  <button
                    onClick={sendReply}
                    disabled={busy || !draft.trim()}
                    className="py-2.5 px-4 ar-grad rounded-[11px] text-ar-ongold text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer disabled:opacity-60"
                  >
                    Kirim
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
