"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/LogoutButton";

const DESKS = [
  { href: "/admin", label: "Ringkasan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT"] },
  { href: "/admin/lokasi", label: "Lokasi & Absensi", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "SUPERVISOR"] },
  { href: "/admin/karyawan", label: "Karyawan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT"] },
  { href: "/admin/pendapatan", label: "Input Pendapatan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT"] },
  { href: "/admin/kasbon", label: "Kasbon", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT"] },
  { href: "/admin/laporan", label: "Laporan Pendapatan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT"] },
  { href: "/admin/payslip", label: "Rincian Totalan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT"] },
  { href: "/admin/lapor-lapangan", label: "Laporan Lapangan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "SUPERVISOR"] },
  { href: "/admin/jabatan", label: "Jabatan Kantor", roles: ["OWNER", "CONSULTANT"] },
  { href: "/admin/pengaturan", label: "Pengaturan Tampilan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT"] },
] as const;

export default function AdminSidebar({
  roleLabel,
  canApprove,
  accessRole,
  supervisorOnly,
}: {
  roleLabel: string;
  canApprove: boolean;
  accessRole: string;
  supervisorOnly?: boolean;
}) {
  const pathname = usePathname();
  const [pendingKasbon, setPendingKasbon] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desks = DESKS.filter((d) => (d.roles as readonly string[]).includes(accessRole));

  useEffect(() => {
    if (supervisorOnly) return;
    fetch("/api/admin/kasbon")
      .then((r) => r.json())
      .then((d) => setPendingKasbon((d.kasbon ?? []).filter((k: { pending: boolean }) => k.pending).length))
      .catch(() => {});
  }, [supervisorOnly]);

  const navLinks = (onNavigate?: () => void) => (
    <div className="flex flex-col gap-1">
      {desks.map((d) => {
        const active = d.href === "/admin" ? pathname === "/admin" : pathname.startsWith(d.href);
        return (
          <Link
            key={d.href}
            href={d.href}
            onClick={onNavigate}
            className={`flex items-center justify-between py-2 px-2.5 rounded-[9px] text-[12.5px] ${
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
  );

  const accountCard = (
    <div className="mt-auto p-3.5 bg-ar-surface2 border border-ar-line rounded-xl">
      <div className="text-[10px] tracking-[0.14em] uppercase text-ar-dim">Masuk sebagai</div>
      <div className="text-[13px] mt-1.5">{roleLabel}</div>
      <div className="text-[10.5px] text-ar-gold mt-1">
        {supervisorOnly
          ? "Akses absensi & laporan lapangan saja"
          : canApprove
            ? "Akses penuh · dapat approve"
            : "Akses lihat & unduh laporan"}
      </div>
      <LogoutButton className="w-full mt-2.5 py-2 bg-transparent border border-ar-line rounded-[9px] text-ar-dim text-[10.5px] cursor-pointer" />
    </div>
  );

  return (
    <>
      {/* Mobile top bar — replaces the persistent sidebar below the lg breakpoint.
          Kept deliberately minimal: small logo, no brand text/border box, an
          icon-only menu button. */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2.5">
        <Image
          src="/api/brand-logo"
          alt="AR Corp"
          width={26}
          height={26}
          unoptimized
          className="rounded-full object-contain bg-ar-bg border border-ar-goldline"
        />
        <button onClick={() => setMobileOpen(true)} aria-label="Buka menu" className="p-2 text-ar-dim cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex bg-black/60"
          onClick={(e) => e.target === e.currentTarget && setMobileOpen(false)}
        >
          <div className="w-[75%] max-w-[280px] h-full bg-ar-bg p-3.5 flex flex-col gap-5 overflow-y-auto">
            <div className="flex items-center justify-between px-1">
              <Image
                src="/api/brand-logo"
                alt="AR Corp"
                width={30}
                height={30}
                unoptimized
                className="rounded-full object-contain bg-ar-bg border border-ar-goldline"
              />
              <button onClick={() => setMobileOpen(false)} aria-label="Tutup menu" className="p-1.5 text-ar-dim cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="5" y1="5" x2="19" y2="19" />
                  <line x1="19" y1="5" x2="5" y2="19" />
                </svg>
              </button>
            </div>
            {navLinks(() => setMobileOpen(false))}
            <div className="mt-auto pt-3 border-t border-ar-line text-[11px] text-ar-dim flex items-center justify-between">
              <span>{roleLabel}</span>
              <LogoutButton className="text-ar-faint cursor-pointer" />
            </div>
          </div>
        </div>
      )}

      {/* Desktop persistent sidebar */}
      <div className="hidden lg:flex w-60 shrink-0 border-r border-ar-line p-4 sm:p-5 flex-col gap-6">
        <div className="flex items-center gap-3 px-1.5">
          <Image
            src="/api/brand-logo"
            alt="AR Corp"
            width={40}
            height={40}
            unoptimized
            className="rounded-full object-contain bg-ar-bg border border-ar-goldline"
          />
          <div>
            <div className="font-display text-[12.5px] tracking-[0.3em] text-ar-gold uppercase">AR Corp</div>
            <div className="text-[9.5px] tracking-[0.14em] text-ar-dim mt-1 uppercase">Kantor Pusat</div>
          </div>
        </div>

        {navLinks()}
        {accountCard}

        <Link href="/dev/nav-layout" className="text-[9.5px] text-ar-faint px-1.5 -mt-3">
          Nav layout preview (dev)
        </Link>
      </div>
    </>
  );
}
