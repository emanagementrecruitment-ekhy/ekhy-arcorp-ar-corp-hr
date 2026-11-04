import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import DownloadLinks from "@/components/DownloadLinks";
import { OFFICE_ROLES, type AccessRole } from "@/lib/constants";

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

        <div className="mt-8">
          <DownloadLinks />
        </div>

        <Link href="/panduan" className="mt-10 text-[11px] text-ar-dim underline underline-offset-4">
          Panduan Aplikasi
        </Link>
      </div>
    </div>
  );
}
