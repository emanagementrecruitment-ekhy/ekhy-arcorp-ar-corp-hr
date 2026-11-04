import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { OFFICE_ROLES, type AccessRole } from "@/lib/constants";

// Download targets. Android defaults to the APK shipped with the app; every client can point any of them at its own file
// or store page with NEXT_PUBLIC_DOWNLOAD_ANDROID / _IOS (inlined at build time). Without an own file,
// iPhone/iPad install the web app straight from the browser, which needs no store.
const ANDROID_URL = process.env.NEXT_PUBLIC_DOWNLOAD_ANDROID || "/downloads/arcorp.apk";
const IOS_URL = process.env.NEXT_PUBLIC_DOWNLOAD_IOS || "";

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-ar-surface border border-ar-goldline rounded-2xl flex flex-col gap-2">
      <div className="flex items-center gap-2 font-display text-[14px] text-ar-gold2">
        <span aria-hidden>{icon}</span>
        {title}
      </div>
      <div className="text-[11.5px] leading-[1.6] text-ar-dim flex-1">{children}</div>
    </div>
  );
}

const btn = "mt-1 inline-block text-center py-2.5 px-4 ar-grad rounded-[11px] text-ar-ongold text-[11px] font-bold tracking-[0.14em] uppercase";

export default async function Home() {
  const session = await getSession();
  if (session) {
    if (OFFICE_ROLES.includes(session.accessRole as AccessRole)) redirect("/admin");
    redirect("/app");
  }
  return (
    <div className="min-h-screen bg-ar-bg text-ar-text">
      <div className="max-w-3xl mx-auto px-5 py-10 sm:py-14 flex flex-col items-center text-center">
        <Image src="/api/brand-logo" alt={BRAND.short} width={112} height={112} priority unoptimized className="w-[104px] h-[104px] object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.6)]" />
        <h1 className="font-display text-[24px] sm:text-[30px] mt-4">{BRAND.product}</h1>
        <div className="text-[11px] tracking-[0.3em] uppercase ar-shimmer-gold font-semibold mt-1">{BRAND.slogan}</div>
        <p className="text-[12.5px] text-ar-dim mt-3 max-w-md leading-[1.7]">{BRAND.short} · {BRAND.subtitle}. Pasang aplikasinya di perangkat Anda, lalu masuk.</p>
        <Link href="/login" className={`${btn} mt-5 px-8`}>
          Masuk
        </Link>

        <div className="grid gap-3.5 sm:grid-cols-2 w-full mt-9 text-left">
          <Card title="Android" icon="🤖">
            Unduh file aplikasi (APK), buka, lalu izinkan pemasangan dari sumber ini bila diminta.
            <br />
            <a href={ANDROID_URL} download className={btn}>
              Unduh APK
            </a>
          </Card>
          <Card title="iPhone / iOS" icon="🍎">
            {IOS_URL ? (
              <>
                Pasang dari tautan di bawah.
                <br />
                <a href={IOS_URL} target="_blank" rel="noopener noreferrer" className={btn}>
                  Pasang di iPhone
                </a>
              </>
            ) : (
              <>
                Buka halaman ini di <b>Safari</b>, tekan tombol <b>Bagikan</b>, lalu pilih <b>Tambah ke Layar Utama</b>. Ikon aplikasi muncul di layar iPhone Anda.
              </>
            )}
          </Card>
          <Card title="iPad" icon="📱">
            Sama seperti iPhone: buka di <b>Safari</b>, tekan <b>Bagikan</b>, lalu <b>Tambah ke Layar Utama</b>.
          </Card>
        </div>

        <Link href="/panduan" className="mt-8 text-[11px] text-ar-dim underline underline-offset-4">
          Panduan Aplikasi
        </Link>
      </div>
    </div>
  );
}
