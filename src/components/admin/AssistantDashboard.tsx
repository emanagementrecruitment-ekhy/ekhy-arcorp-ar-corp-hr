"use client";

import { useCallback, useEffect, useState } from "react";
import type { AssistantSnapshot } from "@/lib/assistant";

const rp = (n: number) => "Rp " + Math.round(n).toLocaleString("id-ID");

const STATE_STYLE: Record<string, string> = {
  selesai: "text-ar-green border-ar-green/40",
  menunggu: "text-ar-gold border-ar-goldline",
  terlewat: "text-ar-dim border-ar-line",
};
const STATE_LABEL: Record<string, string> = { selesai: "Selesai", menunggu: "Menunggu", terlewat: "Terlewat" };

function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="bg-ar-surface border border-ar-line rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-[10px] tracking-[0.16em] uppercase text-ar-gold">{title}</div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "red" | "green" }) {
  return (
    <div className="bg-ar-surface border border-ar-line rounded-2xl p-4">
      <div className="text-[10px] tracking-[0.14em] uppercase text-ar-dim">{label}</div>
      <div className={`font-display text-[28px] font-semibold mt-1 ${tone === "red" ? "text-ar-red" : tone === "green" ? "text-ar-green" : "text-ar-text"}`}>{value}</div>
      {sub && <div className="text-[11.5px] text-ar-dim mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AssistantDashboard() {
  const [data, setData] = useState<AssistantSnapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "remind" | "toggle">("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/assistant", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Gagal memuat.");
      setData(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat.");
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);

  async function post(action: "remind" | "toggle", extra?: Record<string, unknown>) {
    setBusy(action);
    setMsg("");
    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) setMsg(d.error ?? "Gagal.");
      else if (action === "remind") setMsg(d.summary ?? "Pengingat dikirim.");
      await load();
    } finally {
      setBusy("");
    }
  }

  if (error && !data) return <div className="mt-6 text-[12.5px] text-ar-red">{error}</div>;
  if (!data) return <div className="mt-6 text-[12.5px] text-ar-dim">Memuat…</div>;

  const { attendance, vcr, coverage } = data;
  const pct = attendance.expected ? Math.round((attendance.checked / attendance.expected) * 100) : 0;
  const noPush = coverage.total - coverage.withPush;

  return (
    <div className="mt-6 flex flex-col gap-4">
      {/* Status + on/off */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-ar-surface border border-ar-line rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${data.enabled ? "bg-ar-green" : "bg-ar-faint"}`} />
          <div>
            <div className="text-[13px] font-semibold">{data.enabled ? "Asisten aktif" : "Asisten dijeda"}</div>
            <div className="text-[11.5px] text-ar-dim">
              {data.enabled ? "Pengingat dan pengecekan berjalan otomatis sesuai jadwal" : "Tidak ada pengingat otomatis yang dikirim"} · {data.now.time} WIB
            </div>
          </div>
        </div>
        <button
          disabled={busy !== ""}
          onClick={() => post("toggle", { enabled: !data.enabled })}
          className="py-2 px-4 rounded-[10px] border border-ar-goldline text-ar-gold text-[11px] font-semibold tracking-[0.1em] uppercase cursor-pointer disabled:opacity-50"
        >
          {data.enabled ? "Jeda" : "Nyalakan"}
        </button>
      </div>

      {!data.pushReady && (
        <div className="text-[12px] text-ar-red bg-ar-surface border border-ar-red/40 rounded-2xl p-4">
          Notifikasi push belum diatur di server (kunci VAPID kosong), jadi pengingat ke HP karyawan belum bisa terkirim. Laporan ke kantor tetap jalan.
        </div>
      )}
      {data.pushReady && noPush > 0 && (
        <div className="text-[12px] text-ar-dim bg-ar-surface border border-ar-line rounded-2xl p-4">
          {coverage.withPush} dari {coverage.total} karyawan/Tera sudah mengaktifkan notifikasi. {noPush} lainnya tidak akan menerima pengingat sampai mereka
          mengaktifkannya di aplikasi.
        </div>
      )}

      {/* Claude allowance: the only paid part of Ara */}
      <div className="text-[12px] text-ar-dim bg-ar-surface border border-ar-line rounded-2xl p-4">
        {data.ai.configured ? (
          <>
            Ara AI (Claude) hari ini: <b className="text-ar-text">{data.ai.used}</b> dari batas <b className="text-ar-text">{data.ai.limit}</b> pertanyaan bebas. Pertanyaan umum
            (absen, VCR, Slip Pay, kasbon) dijawab tanpa AI dan tidak dihitung. Batas diatur lewat ASSISTANT_AI_DAILY_LIMIT dan ASSISTANT_AI_PER_USER_LIMIT di Railway.
          </>
        ) : (
          <>Ara AI (Claude) belum aktif: ANTHROPIC_API_KEY belum diisi di server. Ara tetap menjawab pertanyaan umum berbasis aturan.</>
        )}
      </div>

      {/* Today at a glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Sudah absen"
          value={`${attendance.checked}/${attendance.expected}`}
          sub={`${pct}% hari ini`}
          tone={attendance.expected > 0 && attendance.checked === attendance.expected ? "green" : undefined}
        />
        <Stat label="VCR hari ini" value={`${vcr.todayCount}`} sub={rp(vcr.todayAmount)} />
        <Stat label="Rata-rata 7 hari" value={`${vcr.avgCount}`} sub="voucher per hari" />
        <Stat label="VCR bulan ini" value={`${vcr.monthCount}`} sub={rp(vcr.monthAmount)} />
      </div>

      {vcr.flags.length > 0 && (
        <Card title="Perlu dicek">
          <ul className="flex flex-col gap-2 text-[12.5px] text-ar-red">
            {vcr.flags.map((f) => (
              <li key={f}>⚠ {f}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card
          title={`Belum absen (${attendance.unchecked.length})`}
          right={
            attendance.unchecked.length > 0 ? (
              <button
                disabled={busy !== ""}
                onClick={() => post("remind")}
                className="py-1.5 px-3 rounded-lg border border-ar-goldline bg-ar-surface2 text-ar-gold text-[10px] font-bold tracking-[0.1em] uppercase cursor-pointer disabled:opacity-50"
              >
                {busy === "remind" ? "Mengirim…" : "Ingatkan sekarang"}
              </button>
            ) : null
          }
        >
          {msg && <div className="text-[11.5px] text-ar-gold2 mb-2">{msg}</div>}
          {attendance.unchecked.length === 0 ? (
            <div className="text-[12.5px] text-ar-green">Semua sudah absen hari ini.</div>
          ) : (
            <div className="flex flex-col divide-y divide-ar-line max-h-[340px] overflow-y-auto">
              {attendance.unchecked.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
                  <div className="min-w-0">
                    <div className="truncate">{p.name}</div>
                    <div className="text-[11px] text-ar-dim">
                      {p.role} · {p.place}
                    </div>
                  </div>
                  <span className={`shrink-0 text-[10px] ${p.hasPush ? "text-ar-dim" : "text-ar-red"}`}>
                    {p.hasPush ? "bisa diingatkan" : "belum aktifkan notifikasi"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="VCR per Tera hari ini">
          {vcr.tera.length === 0 ? (
            <div className="text-[12.5px] text-ar-dim">Belum ada Tera terdaftar.</div>
          ) : (
            <div className="flex flex-col divide-y divide-ar-line max-h-[340px] overflow-y-auto">
              {vcr.tera.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-2 text-[12.5px]">
                  <div className="min-w-0">
                    <div className="truncate">{t.name}</div>
                    <div className="text-[11px] text-ar-dim">
                      {t.checkedIn ? "sudah absen" : "belum absen"} · biasanya {t.avg}/hari
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={t.today === 0 ? "text-ar-dim" : "text-ar-text font-semibold"}>{t.today} voucher</div>
                    <div className="text-[11px] text-ar-dim">{rp(t.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Jadwal otomatis hari ini">
          <div className="flex flex-col divide-y divide-ar-line">
            {data.schedule.map((t) => (
              <div key={t.id} className="py-2.5">
                <div className="flex items-center justify-between gap-3 text-[12.5px]">
                  <div>
                    <span className="text-ar-gold font-semibold tabular-nums mr-2">{t.time}</span>
                    {t.label}
                  </div>
                  <span className={`shrink-0 py-0.5 px-2 rounded-full border text-[10px] ${STATE_STYLE[t.state]}`}>{STATE_LABEL[t.state]}</span>
                </div>
                {t.summary && <div className="text-[11.5px] text-ar-dim mt-1">{t.summary}</div>}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Riwayat kerja asisten">
          {data.recent.length === 0 ? (
            <div className="text-[12.5px] text-ar-dim">Belum ada yang dijalankan.</div>
          ) : (
            <div className="flex flex-col divide-y divide-ar-line max-h-[380px] overflow-y-auto">
              {data.recent.map((r) => (
                <div key={r.id} className="py-2.5 text-[12.5px]">
                  <div className="flex justify-between gap-3">
                    <span>{r.label}</span>
                    <span className="text-ar-dim text-[11px] shrink-0">
                      {r.dateKey} · {r.time}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-ar-dim mt-0.5">{r.summary}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
