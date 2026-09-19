"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { THEME_COLORS, THEME_FONTS, LIGHT_MODES, type ThemeColorId, type ThemeFontId, type LightModeId } from "@/lib/constants";

interface LogoInfo {
  hasCustom: boolean;
  updatedAt: string | null;
  unlockAt: string | null;
  locked: boolean;
  canManage: boolean;
}

export default function PengaturanPage() {
  const [themeColor, setThemeColor] = useState<ThemeColorId>("classic");
  const [themeFont, setThemeFont] = useState<ThemeFontId>("classic");
  const [lightMode, setLightMode] = useState<LightModeId>("auto");
  const [logo, setLogo] = useState<LogoInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [logoMsg, setLogoMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setThemeColor(d.themeColor);
        setThemeFont(d.themeFont);
        setLightMode(d.lightMode);
        setLogo(d.logo);
      });
  }

  useEffect(load, []);

  async function save() {
    setBusy(true);
    setMsg("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeColor, themeFont, lightMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? "Gagal menyimpan pengaturan.");
        return;
      }
      setSaved(true);
      // Re-render with the new theme/font applied everywhere (they're set on <html> server-side).
      setTimeout(() => window.location.reload(), 700);
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
    setLogoMsg("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/admin/settings/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLogoMsg(data.error ?? "Gagal mengganti logo.");
        return;
      }
      load();
      setLogoMsg("✓ Logo berhasil diganti.");
    } finally {
      setLogoBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader title="Pengaturan Tampilan" subtitle="Warna, font, dan logo dashboard — perubahan berlaku di seluruh aplikasi." />

      <div className="grid gap-6 pt-5.5 max-w-2xl">
        <div>
          <div className="font-display text-[19px] text-ar-gold2 mb-1">Warna Dashboard</div>
          <div className="text-[11.5px] text-ar-dim mb-3">Pilih salah satu palet warna natural untuk seluruh aplikasi.</div>
          <div className="grid grid-cols-2 gap-3">
            {THEME_COLORS.map((t) => (
              <button
                key={t.id}
                onClick={() => setThemeColor(t.id)}
                className={`text-left p-3.5 rounded-2xl border cursor-pointer transition ${
                  themeColor === t.id ? "bg-ar-goldfill border-ar-goldline" : "bg-ar-surface border-ar-line"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-4 h-4 rounded-full border border-ar-line shrink-0"
                    style={{ background: THEME_SWATCH[t.id] }}
                  />
                  <span className="text-[12.5px] font-semibold text-ar-text">{t.label}</span>
                  {themeColor === t.id && <span className="ml-auto text-[9.5px] uppercase tracking-[0.1em] text-ar-gold">Aktif</span>}
                </div>
                <div className="text-[10.5px] text-ar-dim leading-[1.5]">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="font-display text-[19px] text-ar-gold2 mb-1">Mode Siang/Malam</div>
          <div className="text-[11.5px] text-ar-dim mb-3">
            Atur tampilan terang/gelap dashboard — bisa otomatis mengikuti jam HP masing-masing pengguna, atau dikunci manual.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {LIGHT_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setLightMode(m.id)}
                className={`text-left p-3.5 rounded-2xl border cursor-pointer transition ${
                  lightMode === m.id ? "bg-ar-goldfill border-ar-goldline" : "bg-ar-surface border-ar-line"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[12.5px] font-semibold text-ar-text">{m.label}</span>
                  {lightMode === m.id && <span className="ml-auto text-[9.5px] uppercase tracking-[0.1em] text-ar-gold">Aktif</span>}
                </div>
                <div className="text-[10.5px] text-ar-dim leading-[1.5]">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="font-display text-[19px] text-ar-gold2 mb-1">Font Dashboard</div>
          <div className="text-[11.5px] text-ar-dim mb-3">Pilih pasangan font judul + teks untuk seluruh aplikasi.</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {THEME_FONTS.map((f) => (
              <button
                key={f.id}
                onClick={() => setThemeFont(f.id)}
                className={`text-left p-3.5 rounded-2xl border cursor-pointer transition ${
                  themeFont === f.id ? "bg-ar-goldfill border-ar-goldline" : "bg-ar-surface border-ar-line"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[12.5px] font-semibold text-ar-text">{f.label}</span>
                  {themeFont === f.id && <span className="ml-auto text-[9.5px] uppercase tracking-[0.1em] text-ar-gold">Aktif</span>}
                </div>
                <div className="text-[10.5px] text-ar-dim leading-[1.5]">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          {msg && <div className="text-[11.5px] text-ar-red mb-2">{msg}</div>}
          {saved && <div className="text-[11.5px] text-ar-green mb-2">✓ Tersimpan — memuat ulang…</div>}
          <button
            disabled={busy}
            onClick={save}
            className="py-2.5 px-5 ar-grad rounded-[10px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase cursor-pointer disabled:opacity-60"
          >
            Simpan Warna, Font &amp; Mode
          </button>
        </div>

        <div className="pt-4 border-t border-ar-line">
          <div className="font-display text-[19px] text-ar-gold2 mb-1">Logo Aplikasi</div>
          {logo?.canManage ? (
            <>
              <div className="text-[11.5px] text-ar-dim mb-3 leading-[1.6]">
                Hanya Owner &amp; Consultant yang bisa mengganti logo. Setelah diganti, logo terkunci minimal 30 hari
                sebelum bisa diganti lagi.
              </div>
              <div className="flex items-center gap-3.5 p-4 bg-ar-surface border border-ar-line rounded-2xl">
                <Image
                  src="/api/brand-logo"
                  alt="Logo saat ini"
                  width={64}
                  height={64}
                  unoptimized
                  className="w-16 h-16 rounded-full object-contain bg-ar-bg border border-ar-goldline"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] text-ar-text">{logo.hasCustom ? "Logo kustom aktif" : "Logo bawaan AR Corp"}</div>
                  {logo.locked && logo.unlockAt ? (
                    <div className="text-[10.5px] text-ar-gold mt-1">
                      Terkunci — bisa diganti lagi mulai{" "}
                      {new Date(logo.unlockAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  ) : (
                    <div className="text-[10.5px] text-ar-dim mt-1">Bisa diganti sekarang.</div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" hidden onChange={onLogoSelected} />
                <button
                  disabled={logo.locked || logoBusy}
                  onClick={pickLogoFile}
                  className="py-2 px-3.5 bg-ar-surface2 border border-ar-line rounded-[9px] text-ar-gold text-[11px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {logoBusy ? "Mengunggah…" : "Ganti Logo"}
                </button>
              </div>
              {logoMsg && <div className="text-[11.5px] text-ar-green mt-2">{logoMsg}</div>}
            </>
          ) : (
            <div className="text-[11.5px] text-ar-dim leading-[1.6]">
              Hanya Owner &amp; Consultant yang bisa mengganti logo aplikasi.
            </div>
          )}
        </div>

        {logo?.canManage && (
          <div className="pt-4 border-t border-ar-line">
            <div className="font-display text-[19px] text-ar-gold2 mb-1">Cadangkan Data</div>
            <div className="text-[11.5px] text-ar-dim mb-3 leading-[1.6]">
              Unduh seluruh database aplikasi (data karyawan, voucher, kasbon, rincian totalan, dan pengaturan) sebagai
              satu file. Simpan file ini di tempat aman di luar aplikasi — ini satu-satunya salinan lengkap data
              bisnis Anda.
            </div>
            <a
              href="/api/admin/backup"
              className="inline-block py-2.5 px-4 bg-ar-surface2 border border-ar-goldline rounded-[10px] text-ar-gold text-[11px] font-semibold tracking-[0.1em] uppercase cursor-pointer"
            >
              Unduh Cadangan Database
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const THEME_SWATCH: Record<ThemeColorId, string> = {
  classic: "#c9a24a",
  sand: "#b5782e",
  sage: "#7a874f",
  terracotta: "#c15a35",
  rosegold: "#c88282",
  pearl: "#d6d2c9",
};
