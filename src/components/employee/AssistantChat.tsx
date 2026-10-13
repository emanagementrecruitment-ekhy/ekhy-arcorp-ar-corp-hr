"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ArMascot from "./ArMascot";

interface Msg {
  role: "user" | "assistant";
  content: string;
  links?: { href: string; label: string }[];
  canForward?: boolean;
  forwardOf?: string; // the employee message this reply can forward to the office
  forwarded?: boolean;
}

// Same chat for two audiences: field staff (their own data, can forward wishes to the office) and the office
// (read-only questions about employees).
const VARIANTS = {
  employee: {
    endpoint: "/api/assistant/chat",
    quick: ["Sudah absen belum?", "Berapa VCR saya?", "Total Slip Pay saya", "Status kasbon saya", "Saya mau izin"],
    greeting:
      "Halo! Saya Ara, asisten AR Corp. Tanya apa saja soal absen, VCR, Slip Pay, atau kasbon. Kalau kamu butuh izin atau punya keluhan, ceritakan saja, nanti saya teruskan ke kantor.",
    placeholder: "Tulis pertanyaan atau keinginanmu…",
    subtitle: "Asisten AR Corp · siap membantu",
    fab: "fixed right-3 bottom-[92px] z-40 flex items-end gap-2",
    hint: "Ada pertanyaan? Tanya",
  },
  admin: {
    endpoint: "/api/admin/assistant/chat",
    quick: ["Ringkasan hari ini", "Siapa belum absen?", "Kasbon menunggu", "Rincian karyawan…"],
    greeting:
      "Halo! Saya Ara, asisten admin. Saya bisa menampilkan ringkasan hari ini, yang belum absen, kasbon menunggu, dan rincian tiap karyawan (absen, VCR, kasbon, Slip Pay). Saya hanya membaca data, tidak mengubah apa pun.",
    placeholder: "Tanya data karyawan, mis. rincian Budi…",
    subtitle: "Asisten admin · hanya membaca data",
    fab: "fixed right-4 bottom-16 z-40 flex items-end gap-2",
    hint: "Butuh data karyawan? Tanya",
  },
} as const;

export default function AssistantChat({ variant = "employee" }: { variant?: "employee" | "admin" }) {
  const cfg = VARIANTS[variant];
  const GREETING: Msg = { role: "assistant", content: cfg.greeting };
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [talking, setTalking] = useState(false);
  const [hint, setHint] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy, open]);

  // One-time speech bubble so the new helper is noticed, never shown again after it was opened once.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (!localStorage.getItem("ara-seen")) setHint(true);
      } catch {
        setHint(true);
      }
    }, 1500);
    const hide = setTimeout(() => setHint(false), 10_000);
    return () => {
      clearTimeout(t);
      clearTimeout(hide);
    };
  }, []);

  function openChat() {
    setOpen(true);
    setHint(false);
    try {
      localStorage.setItem("ara-seen", "1");
    } catch {}
  }

  async function send(raw: string) {
    const message = raw.trim();
    if (!message || busy) return;
    const history = msgs.filter((m) => m !== msgs[0]).map((m) => ({ role: m.role, content: m.content }));
    setMsgs((cur) => [...cur, { role: "user", content: message }]);
    setText("");
    setBusy(true);
    try {
      const res = await fetch(cfg.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Asisten sedang tidak bisa menjawab.");
      setMsgs((cur) => [
        ...cur,
        { role: "assistant", content: data.text, links: data.links, canForward: data.canForward, forwardOf: message },
      ]);
      setTalking(true);
      setTimeout(() => setTalking(false), 1800);
    } catch (e) {
      setMsgs((cur) => [...cur, { role: "assistant", content: e instanceof Error ? e.message : "Asisten sedang tidak bisa menjawab." }]);
    } finally {
      setBusy(false);
    }
  }

  async function forward(index: number) {
    const m = msgs[index];
    if (!m?.forwardOf || m.forwarded) return;
    setMsgs((cur) => cur.map((x, i) => (i === index ? { ...x, forwarded: true } : x)));
    try {
      const res = await fetch("/api/assistant/forward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: m.forwardOf }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim ke kantor.");
      setMsgs((cur) => [...cur, { role: "assistant", content: "Sudah saya kirim ke kantor ya. Kamu akan dihubungi setelah ditinjau. 🙏" }]);
    } catch (e) {
      setMsgs((cur) => [
        ...cur.map((x, i) => (i === index ? { ...x, forwarded: false } : x)),
        { role: "assistant", content: e instanceof Error ? e.message : "Gagal mengirim ke kantor." },
      ]);
    }
  }

  return (
    <>
      {!open && (
        <div className={cfg.fab}>
          {hint && (
            <button
              type="button"
              onClick={openChat}
              className="mb-3 max-w-[180px] rounded-2xl rounded-br-sm border border-ar-goldline bg-ar-surface px-3 py-2 text-left text-[12px] leading-snug text-ar-text shadow-lg"
            >
              {cfg.hint} <b>Ara</b> ya!
            </button>
          )}
          <button
            type="button"
            onClick={openChat}
            aria-label="Buka asisten Ara"
            className="arc-ara-fab rounded-full border border-ar-goldline bg-ar-surface p-1 shadow-xl"
          >
            <ArMascot size={54} />
          </button>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/55" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="Asisten Ara"
            onClick={(e) => e.stopPropagation()}
            className="flex h-[78vh] max-h-[640px] w-full max-w-[460px] flex-col overflow-hidden rounded-t-3xl border border-ar-goldline bg-ar-surface shadow-2xl sm:rounded-3xl"
          >
            <header className="flex items-center gap-3 border-b border-ar-line px-4 py-3">
              <div className="rounded-full border border-ar-goldline bg-ar-bg p-0.5">
                <ArMascot size={42} mood={busy ? "thinking" : talking ? "talking" : "idle"} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium text-ar-text">Ara</div>
                <div className="text-[11px] text-ar-dim">{busy ? "sedang berpikir…" : cfg.subtitle}</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Tutup" className="rounded-full p-2 text-ar-dim hover:text-ar-text">
                <span aria-hidden className="block h-5 w-5 text-center text-[18px] leading-5">✕</span>
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-2"}>
                  {m.role === "assistant" && (
                    <div className="mt-0.5 shrink-0">
                      <ArMascot size={28} />
                    </div>
                  )}
                  <div className={m.role === "user" ? "max-w-[82%]" : "max-w-[86%]"}>
                    <div
                      className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                        m.role === "user"
                          ? "rounded-br-sm bg-ar-goldfill text-ar-text border border-ar-goldline"
                          : "rounded-tl-sm bg-ar-surface2 text-ar-text border border-ar-line"
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.role === "assistant" && (m.links?.length || m.canForward) ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {m.links?.map((l) => (
                          <Link
                            key={l.href}
                            href={l.href}
                            onClick={() => setOpen(false)}
                            className="rounded-full border border-ar-goldline bg-ar-goldfill px-3 py-1.5 text-[11.5px] font-medium text-ar-text"
                          >
                            {l.label}
                          </Link>
                        ))}
                        {m.canForward && (
                          <button
                            type="button"
                            disabled={m.forwarded}
                            onClick={() => forward(i)}
                            className="rounded-full bg-ar-gold px-3 py-1.5 text-[11.5px] font-medium text-ar-ongold disabled:opacity-50"
                          >
                            {m.forwarded ? "Terkirim ✓" : "Kirim ke kantor"}
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex gap-2">
                  <div className="mt-0.5 shrink-0">
                    <ArMascot size={28} mood="thinking" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm border border-ar-line bg-ar-surface2 px-3.5 py-2.5 text-[13px] text-ar-dim">Sebentar ya…</div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t border-ar-line px-3 pt-2.5 pb-3">
              {msgs.length <= 1 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {cfg.quick.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => (q.endsWith("…") ? setText(q.slice(0, -1) + " ") : send(q))}
                      className="rounded-full border border-ar-line px-3 py-1.5 text-[11.5px] text-ar-dim hover:text-ar-text"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(text);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={500}
                  placeholder={cfg.placeholder}
                  className="min-w-0 flex-1 rounded-full border border-ar-line bg-ar-input px-4 py-2.5 text-[13.5px] text-ar-text outline-none focus:border-ar-goldline"
                />
                <button
                  type="submit"
                  disabled={busy || !text.trim()}
                  aria-label="Kirim"
                  className="rounded-full bg-ar-gold px-4 py-2.5 text-[13px] font-medium text-ar-ongold disabled:opacity-40"
                >
                  Kirim
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
