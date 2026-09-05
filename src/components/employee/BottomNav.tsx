"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", mono: "B", short: "Home" },
  { href: "/app/voucher", mono: "V", short: "Voucher" },
  { href: "/app/kasbon", mono: "K", short: "Kasbon" },
  { href: "/app/lapor", mono: "L", short: "Lapor" },
  { href: "/app/profil", mono: "P", short: "Profil" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-ar-line bg-ar-surface2 backdrop-blur">
      <div className="max-w-[720px] mx-auto grid grid-cols-5 gap-0.5 px-2 pt-2 pb-3.5">
        {TABS.map((t) => {
          const active = t.href === "/app" ? pathname === "/app" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-1 py-2.5 px-0.5 rounded-[11px] ${
                active ? "bg-ar-goldfill text-ar-gold2" : "text-ar-dim"
              }`}
            >
              <span className="font-display text-[17px] leading-none">{t.mono}</span>
              <span className="text-[8px] tracking-[0.08em] uppercase">{t.short}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
