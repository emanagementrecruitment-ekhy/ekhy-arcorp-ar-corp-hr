"use client";

import { useState } from "react";

// Download targets. Android defaults to the APK shipped with the app; every client can point any of them at its own file
// or store page with NEXT_PUBLIC_DOWNLOAD_ANDROID / _IOS (inlined at build time). Without an own iOS file, iPhone/iPad
// install the web app straight from Safari (no store needed), so the link shows the short steps instead.
const ANDROID_URL = process.env.NEXT_PUBLIC_DOWNLOAD_ANDROID || "/downloads/arcorp.apk";
const IOS_URL = process.env.NEXT_PUBLIC_DOWNLOAD_IOS || "";

const link = "text-ar-dim hover:text-ar-gold2 underline underline-offset-4 decoration-ar-goldline cursor-pointer";

// Plain text links: Android downloads the APK on tap, iPhone/iPad open the install tip (or the store link when set).
export default function DownloadLinks() {
  const [tip, setTip] = useState(false);
  return (
    <div className="text-center text-[11px] leading-[1.9]">
      <div className="flex items-center justify-center flex-wrap gap-x-3">
        <a href={ANDROID_URL} download className={link}>
          APK Android
        </a>
        <span className="text-ar-faint" aria-hidden>·</span>
        {IOS_URL ? (
          <a href={IOS_URL} target="_blank" rel="noopener noreferrer" className={link}>
            iOS / iPhone
          </a>
        ) : (
          <button type="button" onClick={() => setTip((v) => !v)} className={link}>
            iOS / iPhone
          </button>
        )}
        <span className="text-ar-faint" aria-hidden>·</span>
        {IOS_URL ? (
          <a href={IOS_URL} target="_blank" rel="noopener noreferrer" className={link}>
            iPad
          </a>
        ) : (
          <button type="button" onClick={() => setTip((v) => !v)} className={link}>
            iPad
          </button>
        )}
      </div>
      {tip && !IOS_URL && (
        <div className="mt-1.5 text-[10.5px] text-ar-faint max-w-[300px] mx-auto">
          Buka halaman ini di <b>Safari</b>, tekan <b>Bagikan</b>, lalu pilih <b>Tambah ke Layar Utama</b>.
        </div>
      )}
    </div>
  );
}
