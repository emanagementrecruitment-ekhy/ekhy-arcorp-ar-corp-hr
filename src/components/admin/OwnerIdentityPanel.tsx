"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface OwnerIdentity {
  generated: boolean;
  generatedAt: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  logoDataUrl: string | null;
  canEdit: boolean;
}

/**
 * Owner identity provisioning — a one-time (Consultant-only) "generate" of
 * the single Owner account's Name/Email/HP, sealed afterward so nobody else
 * can touch it. Lives here on the dev Nav Layout page rather than the more
 * visible Jabatan Kantor, and carries its own logo independent of the main
 * app brand mark.
 */
export default function OwnerIdentityPanel() {
  const [data, setData] = useState<OwnerIdentity | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch("/api/admin/owner-identity")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setPhone(d.phone ?? "");
      });
  }

  useEffect(load, []);

  async function submit() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/owner-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg(d.error ?? "Gagal menyimpan.");
        return;
      }
      setEditing(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  function pickLogoFile() {
    fileRef.current?.click();
  }

  async function onLogoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/admin/owner-identity/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (res.ok) load();
    } finally {
      setLogoBusy(false);
    }
  }

  if (!data) return null;

  return (
    <div className="p-4 mb-6 bg-ar-surface border border-ar-goldline rounded-2xl">
      <div className="flex items-center gap-3.5">
        <div className="relative shrink-0">
          <Image
            src={data.logoDataUrl || "/api/brand-logo"}
            alt="Logo Owner"
            width={52}
            height={52}
            unoptimized
            className="w-13 h-13 rounded-full object-contain bg-ar-bg border border-ar-goldline"
          />
          {data.canEdit && (
            <button
              onClick={pickLogoFile}
              disabled={logoBusy}
              title="Ganti logo Owner"
              className="absolute -bottom-1 -right-1 w-5 h-5 grid place-items-center rounded-full bg-ar-gold text-ar-ongold text-[10px] cursor-pointer"
            >
              ✎
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" hidden onChange={onLogoSelected} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[9.5px] tracking-[0.16em] uppercase text-ar-dim">Identitas Owner</div>
          {!editing ? (
            data.generated ? (
              <>
                <div className="font-display text-[17px] text-ar-gold2 truncate">{data.name}</div>
                <div className="text-[10.5px] text-ar-dim mt-0.5 truncate">
                  {data.email} · {data.phone}
                </div>
              </>
            ) : (
              <div className="text-[12px] text-ar-faint mt-0.5">Belum di-generate.</div>
            )
          ) : null}
        </div>

        {data.canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 py-2 px-3.5 bg-ar-surface2 border border-ar-line rounded-[9px] text-ar-gold text-[11px] cursor-pointer"
          >
            {data.generated ? "Ganti Owner" : "Generate Owner"}
          </button>
        )}
      </div>

      {editing && data.canEdit && (
        <div className="mt-3.5 pt-3.5 border-t border-ar-line grid gap-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Owner"
            className="w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email terdaftar"
            className="w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="No. Handphone"
            className="w-full py-2.5 px-3.5 bg-ar-input border border-ar-goldline rounded-[10px] text-ar-text text-[12.5px]"
          />
          {msg && <div className="text-[11.5px] text-ar-red">{msg}</div>}
          <div className="flex gap-2.5">
            <button
              disabled={busy}
              onClick={submit}
              className="py-2.5 px-4 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60"
            >
              {data.generated ? "Patenkan Perubahan" : "Generate & Patenkan"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="py-2.5 px-4 bg-ar-surface2 border border-ar-line rounded-[10px] text-ar-dim text-[11px] cursor-pointer"
            >
              Batal
            </button>
          </div>
          <div className="text-[10px] text-ar-faint leading-[1.6]">
            Setelah dipatenkan, Nama/Email/HP Owner terkunci untuk semua orang — hanya Consultant yang bisa
            menggantinya lagi lewat halaman ini.
          </div>
        </div>
      )}

      {data.generated && (
        <div className="mt-3.5 pt-3.5 border-t border-ar-goldline text-center">
          <div className="text-[10px] tracking-[0.2em] uppercase text-ar-gold2 ar-shimmer-gold font-semibold">
            Welcome &amp; Thanks For Join
          </div>
          <div className="text-[11px] text-ar-dim mt-1.5 leading-[1.6] italic">
            &quot;ARCorporation Onboarded &amp; Ready System — HR Unlocked : Owner {data.name}&quot;
          </div>
        </div>
      )}
    </div>
  );
}
