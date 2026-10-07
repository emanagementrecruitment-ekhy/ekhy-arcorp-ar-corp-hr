"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/ui/Icon";

const TABS = [
  { href: "/app", icon: "home", short: "Home" },
  { href: "/app/voucher", icon: "ticket", short: "Voucher" },
  { href: "/app/kasbon", icon: "wallet", short: "Kasbon" },
  { href: "/app/lapor", icon: "flag", short: "Lapor" },
  { href: "/app/profil", icon: "user", short: "Profil" },
] as const satisfies readonly { href: string; icon: IconName; short: string }[];

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
              <Icon name={t.icon} className="w-[22px] h-[22px]" />
              <span className="text-[10px] tracking-[0.06em] uppercase">{t.short}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
