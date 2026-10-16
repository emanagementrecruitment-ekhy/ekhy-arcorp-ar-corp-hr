"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import Icon, { type IconName } from "@/components/ui/Icon";
import LogoutButton from "@/components/LogoutButton";
import RefreshAppButton from "@/components/employee/RefreshAppButton";
import NotificationBell from "@/components/admin/NotificationBell";
import ScreenshotButton from "@/components/admin/ScreenshotButton";

/** True at the lg breakpoint and up. The bell must exist exactly once (it polls and plays the chime), so we pick the layout in JS instead of rendering it in both. */
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false
  );
}

type Link_ = { href: string; label: string; icon: IconName; roles: readonly string[] };
type Group = { group: string; items: readonly Link_[] };
type Desk = Link_ | Group;

const DESKS: readonly Desk[] = [
  { href: "/admin", icon: "home", label: "Ringkasan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] },
  { href: "/admin/asisten", icon: "sparkle", label: "Asisten Harian", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] },
  { href: "/admin/lokasi", icon: "pin", label: "Lokasi, Absensi & Kalender", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "SUPERVISOR", "MANAGER"] },
  { href: "/admin/absensi-harian", icon: "calendar-check", label: "Absensi Harian", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] },
  {
    group: "Operasional · HR & Office",
    items: [
      { href: "/admin/hr-office", icon: "briefcase", label: "HR & Office", roles: ["OWNER", "CONSULTANT", "MANAGER"] },
      { href: "/admin/karyawan/tera", icon: "id-card", label: "Data Tera", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] },
      { href: "/admin/karyawan", icon: "users", label: "Data Karyawan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] },
      { href: "/admin/slip-gaji", icon: "receipt", label: "Slip Gaji Karyawan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] },
    ],
  },
  {
    group: "Report Operasional & Payslip",
    items: [
      { href: "/admin/laporan", icon: "chart", label: "Laporan Totalan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] },
      { href: "/admin/pendapatan", icon: "tray-in", label: "Input Pendapatan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] },
      { href: "/admin/kasbon", icon: "banknote", label: "Kasbon", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] },
      { href: "/admin/payslip", icon: "receipt", label: "Rincian Totalan Tera", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] },
      { href: "/admin/import", icon: "archive", label: "Import Data", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] },
    ],
  },
  { href: "/admin/pengumuman", icon: "bell", label: "Pengumuman", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] },
  { href: "/admin/lapor-lapangan", icon: "megaphone", label: "Laporan Lapangan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "SUPERVISOR", "MANAGER"] },
  { href: "/admin/pengaturan", icon: "sliders", label: "Pengaturan Tampilan", roles: ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] },
];

export default function AdminSidebar({
  roleLabel,
  accessRole,
  supervisorOnly,
}: {
  roleLabel: string;
  canApprove?: boolean;
  accessRole: string;
  supervisorOnly?: boolean;
}) {
  const pathname = usePathname();
  const [pendingKasbon, setPendingKasbon] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const canSee = (roles: readonly string[]) => roles.includes(accessRole);
  const desks: Desk[] = DESKS.map((d) =>
    "group" in d ? { ...d, items: d.items.filter((i) => canSee(i.roles)) } : d
  ).filter((d) => ("group" in d ? d.items.length > 0 : canSee(d.roles)));

  useEffect(() => {
    if (supervisorOnly) return;
    fetch("/api/admin/kasbon")
      .then((r) => r.json())
      .then((d) => setPendingKasbon((d.kasbon ?? []).filter((k: { pending: boolean }) => k.pending).length))
      .catch(() => {});
  }, [supervisorOnly]);

  function navItem(d: Link_, onNavigate?: () => void, mobile?: boolean) {
    // /admin and /admin/karyawan are prefixes of other menu items (Data Tera lives under /admin/karyawan/tera), so they match exactly.
    const active = d.href === "/admin" || d.href === "/admin/karyawan" ? pathname === d.href : pathname.startsWith(d.href);
    return (
      <Link
        key={d.href}
        href={d.href}
        onClick={onNavigate}
        className={`flex items-center justify-between py-2 px-2.5 rounded-[9px] text-[12.5px] transition ${
          active
            ? "bg-ar-goldfill text-ar-gold2 border border-ar-goldline"
            : mobile
              ? "text-ar-dim border border-ar-goldline/25"
              : "text-ar-dim border border-transparent"
        }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Icon name={d.icon} className="w-4 h-4 shrink-0" />
          <span>{d.label}</span>
        </span>
        {d.href === "/admin/kasbon" && pendingKasbon ? (
          <span className="py-0.5 px-1.5 rounded-full text-[10px] bg-ar-goldline text-ar-gold2">{pendingKasbon}</span>
        ) : null}
      </Link>
    );
  }

  const navLinks = (onNavigate?: () => void, mobile?: boolean) => (
    <div className="flex flex-col gap-1.5">
      {desks.map((d) =>
        "group" in d ? (
          <div key={d.group} className="mt-2 first:mt-0">
            <div className="px-2.5 pb-1 text-[9.5px] tracking-[0.16em] uppercase text-ar-faint">{d.group}</div>
            <div className="flex flex-col gap-1.5 pl-2 border-l border-ar-line ml-2.5">
              {d.items.map((i) => navItem(i, onNavigate, mobile))}
            </div>
          </div>
        ) : (
          navItem(d, onNavigate, mobile)
        )
      )}
    </div>
  );

  // "Pusat Sistem" is deliberately kept out of the menu: a small, quiet link under the Keluar button.
  const systemLink = ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"].includes(accessRole) ? (
    <Link
      href="/admin/sistem"
      onClick={() => setMobileOpen(false)}
      className={`block w-full text-center text-[9.5px] ${pathname.startsWith("/admin/sistem") ? "text-ar-gold" : "text-ar-faint"}`}
    >
      Pusat Sistem
    </Link>
  ) : null;

  const accountCard = (
    <div className="mt-auto p-3 bg-ar-surface2 border border-ar-line rounded-2xl">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-ar-goldfill text-ar-gold2">
          <Icon name="id-card" className="w-[17px] h-[17px]" />
        </span>
        <div className="min-w-0">
          <div className="text-[9.5px] tracking-[0.14em] uppercase text-ar-dim">Masuk sebagai</div>
          <div className="text-[12.5px] mt-0.5 truncate">{roleLabel}</div>
        </div>
      </div>
      <LogoutButton className="w-full mt-3 py-2 bg-transparent border border-ar-line rounded-[10px] text-ar-dim text-[11px] cursor-pointer" />
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
          width={30}
          height={30}
          unoptimized
          className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
        />
        <span className="flex items-center gap-1.5">
        <ScreenshotButton />
        <RefreshAppButton iconOnly />
        {!isDesktop && <NotificationBell align="right" />}
        <button onClick={() => setMobileOpen(true)} aria-label="Buka menu" className="p-2 text-ar-dim cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        </span>
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
                className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
              />
              <button onClick={() => setMobileOpen(false)} aria-label="Tutup menu" className="p-1.5 text-ar-dim cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="5" y1="5" x2="19" y2="19" />
                  <line x1="19" y1="5" x2="5" y2="19" />
                </svg>
              </button>
            </div>
            {navLinks(() => setMobileOpen(false), true)}
            <div className="mt-auto pt-3 border-t border-ar-line text-[11px] text-ar-dim flex items-center justify-between">
              <span>{roleLabel}</span>
              <LogoutButton className="text-ar-faint cursor-pointer" />
            </div>
            <div className="-mt-3">{systemLink}</div>
          </div>
        </div>
      )}

      {/* Desktop persistent sidebar */}
      <div className="hidden lg:flex w-60 shrink-0 border-r border-ar-line p-4 sm:p-5 flex-col gap-6">
        <div className="flex items-center gap-2.5 px-1.5">
          <Image
            src="/api/brand-logo"
            alt="AR Corp"
            width={44}
            height={44}
            unoptimized
            className="object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          />
          <div className="min-w-0">
            <div className="font-display text-[12.5px] tracking-[0.2em] text-ar-gold uppercase whitespace-nowrap">AR Corp</div>
            <div className="text-[9.5px] tracking-[0.08em] text-ar-dim mt-1 uppercase whitespace-nowrap">Kantor Pusat</div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-1.5 px-1.5 -mt-3">
          <ScreenshotButton />
          <RefreshAppButton iconOnly />
          {isDesktop && <NotificationBell align="left" />}
        </div>

        {navLinks()}
        {accountCard}
        <div className="-mt-3">{systemLink}</div>
      </div>
    </>
  );
}
