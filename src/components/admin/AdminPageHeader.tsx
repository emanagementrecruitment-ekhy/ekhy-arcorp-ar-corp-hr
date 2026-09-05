"use client";

import { useEffect, useState } from "react";

export default function AdminPageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [clock, setClock] = useState("");

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((d) => setOnlineCount(d.onlineCount))
      .catch(() => {});
    const tick = () => setClock(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-wrap items-end justify-between gap-4.5 pb-5 border-b border-ar-line">
      <div>
        <div className="font-display text-[32px] leading-[1.1]">{title}</div>
        <div className="text-[11.5px] text-ar-dim mt-1.5">{subtitle}</div>
      </div>
      <div className="flex items-center gap-2.5 py-2.5 px-3.5 bg-ar-goldfill border border-ar-goldline rounded-[11px]">
        <span className="w-2 h-2 rounded-full bg-ar-green ar-pulse" />
        <span className="text-[11px] tracking-[0.1em] uppercase text-ar-gold">
          {onlineCount ?? "…"} aktif · {clock}
        </span>
      </div>
    </div>
  );
}
