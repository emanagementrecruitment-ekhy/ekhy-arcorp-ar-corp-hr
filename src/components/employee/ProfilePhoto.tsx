"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface PhotoStatus {
  photoDataUrl: string | null;
  locked: boolean;
  unlockAt: string | null;
}

/** Self-service avatar on /app/profil — replaces the initials monogram once a photo is uploaded, then locks 30 days (mirrors the Owner/app logo lock in /lib/settings.ts). Owner/Consultant can clear it early from the admin employee list. */
export default function ProfilePhoto({ mono }: { mono: string }) {
  const [status, setStatus] = useState<PhotoStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch("/api/profile/photo")
      .then((r) => r.json())
      .then(setStatus);
  }

  useEffect(load, []);

  function pickFile() {
    setMsg("");
    fileRef.current?.click();
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Gagal mengganti foto.");
        return;
      }
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="shrink-0">
      <span className="relative inline-block">
        {status?.photoDataUrl ? (
          <Image
            src={status.photoDataUrl}
            alt="Foto profil"
            width={62}
            height={62}
            unoptimized
            className="w-[62px] h-[62px] rounded-full object-cover border border-ar-goldline"
          />
        ) : (
          <span className="w-[62px] h-[62px] shrink-0 rounded-full border border-ar-goldline grid place-items-center font-display text-2xl text-ar-gold">
            {mono}
          </span>
        )}
        <button
          onClick={pickFile}
          disabled={busy || !status || status.locked}
          title={status?.locked ? "Terkunci — belum bisa diganti" : "Ganti foto profil"}
          className="absolute -bottom-1 -right-1 w-5 h-5 grid place-items-center rounded-full bg-ar-gold text-ar-ongold text-[10px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✎
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={onFileSelected} />
      </span>
      {status?.locked && status.unlockAt && (
        <span className="block text-[9.5px] text-ar-dim mt-1 max-w-[90px] leading-[1.4]">
          Ganti lagi mulai {new Date(status.unlockAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
        </span>
      )}
      {msg && <span className="block text-[9.5px] text-ar-red mt-1 max-w-[140px] leading-[1.4]">{msg}</span>}
    </span>
  );
}
