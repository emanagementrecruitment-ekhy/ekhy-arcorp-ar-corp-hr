"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMsg {
  id: string;
  me: boolean;
  text: string;
  time: string;
}

const TEMPLATES = ["Sudah di lokasi klien", "Butuh approval diskon", "Kendala di lapangan"];

export default function LaporPage() {
  const [supervisor, setSupervisor] = useState<{ name: string; role: string } | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d) => {
        setSupervisor(d.supervisor);
        setMessages(d.messages ?? []);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((m) => [...m, data.message]);
        setDraft("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="font-display text-[26px] pt-3 pb-1">Lapor Supervisor</div>
      <div className="flex items-center gap-2 text-[11px] text-ar-dim mb-3.5">
        <span className="w-1.5 h-1.5 rounded-full bg-ar-green" />
        {supervisor ? `${supervisor.name} · ${supervisor.role} · online` : "Memuat…"}
      </div>

      <div className="flex flex-col gap-2.5 pb-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.me ? "justify-end" : "justify-start"}`}>
            <span
              className={`inline-block max-w-[80%] py-2.5 px-3.5 rounded-2xl text-[13px] ${
                m.me ? "bg-ar-goldfill text-ar-text rounded-br-sm" : "bg-ar-surface2 text-ar-text rounded-bl-sm"
              }`}
            >
              <span className="block">{m.text}</span>
              <span className="block text-[9.5px] opacity-60 mt-1">{m.time}</span>
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-1.5 flex-wrap mb-3">
        {TEMPLATES.map((t) => (
          <button
            key={t}
            onClick={() => setDraft(t)}
            className="py-1.5 px-3 bg-ar-goldfill border border-ar-goldline rounded-full text-ar-gold text-[10.5px] cursor-pointer"
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-2 sticky bottom-24">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(draft)}
          placeholder="Tulis laporan…"
          className="flex-1 min-w-0 py-[13px] px-3.5 bg-ar-input border border-ar-goldline rounded-[11px] text-ar-text text-[13px]"
        />
        <button
          onClick={() => send(draft)}
          disabled={busy}
          className="py-[13px] px-[17px] ar-grad rounded-[11px] text-ar-ongold text-[11px] font-bold tracking-[0.1em] uppercase cursor-pointer disabled:opacity-60"
        >
          Kirim
        </button>
      </div>
    </div>
  );
}
