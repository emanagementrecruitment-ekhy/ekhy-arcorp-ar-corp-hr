"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";

const DESKS = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/lokasi", label: "Lokasi & Absensi" },
  { href: "/admin/karyawan", label: "Karyawan" },
  { href: "/admin/kasbon", label: "Kasbon" },
  { href: "/admin/laporan", label: "Laporan" },
] as const;

export default function AdminSidebar({ roleLabel, canApprove }: { roleLabel: string; canApprove: boolean }) {
  const pathname = usePathname();
  const [pendingKasbon, setPendingKasbon] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/kasbon")
      .then((r) => r.json())
      .then((d) => setPendingKasbon((d.kasbon ?? []).filter((k: { pending: boolean }) => k.pending).length))
      .catch(() => {});
  }, []);

  return (
    <div className="w-60 shrink-0 border-r border-ar-line p-4 sm:p-5 flex flex-col gap-6">
      <div className="flex items-center gap-3 px-1.5">
        <Image
          src="/ar-corp-logo.png"
          alt="AR Corp"
          width={40}
          height={40}
          className="rounded-full object-contain bg-ar-bg border border-ar-goldline"
        />
        <div>
          <div className="font-display text-[12.5px] tracking-[0.3em] text-ar-gold uppercase">AR Corp</div>
          <div className="text-[9.5px] tracking-[0.14em] text-ar-dim mt-1 uppercase">Kantor Pusat</div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {DESKS.map((d) => {
          const active = d.href === "/admin" ? pathname === "/admin" : pathname.startsWith(d.href);
          return (
            <Link
              key={d.href}
              href={d.href}
              className={`flex items-center justify-between py-2.5 px-3 rounded-[10px] text-[12.5px] ${
                active ? "bg-ar-goldfill text-ar-gold2" : "text-ar-dim"
              }`}
            >
              <span>{d.label}</span>
              {d.href === "/admin/kasbon" && pendingKasbon ? (
                <span className="py-0.5 px-1.5 rounded-full text-[10px] bg-ar-goldline text-ar-gold2">{pendingKasbon}</span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto p-3.5 bg-ar-surface2 border border-ar-line rounded-xl">
        <div className="text-[10px] tracking-[0.14em] uppercase text-ar-dim">Masuk sebagai</div>
        <div className="text-[13px] mt-1.5">{roleLabel}</div>
        <div className="text-[10.5px] text-ar-gold mt-1">
          {canApprove ? "Akses penuh · dapat approve" : "Akses lihat & unduh laporan"}
        </div>
        <LogoutButton className="w-full mt-2.5 py-2 bg-transparent border border-ar-line rounded-[9px] text-ar-dim text-[10.5px] cursor-pointer" />
      </div>

      <Link href="/dev/nav-layout" className="text-[9.5px] text-ar-faint px-1.5 -mt-3">
        Nav layout preview (dev)
      </Link>
    </div>
  );
}
