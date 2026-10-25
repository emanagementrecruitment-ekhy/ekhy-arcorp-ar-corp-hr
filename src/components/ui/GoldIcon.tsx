import Image from "next/image";
import Icon, { type IconName } from "@/components/ui/Icon";

/** Gold medallion icons (public/icons/gold). The PNGs have a black background, so
 *  mix-blend-mode: screen makes the black vanish on the dark UI. */
export const GOLD_FILES = {
  screenshot: "screenshot",
  refresh: "refresh",
  notifikasi: "notifikasi",
  absensi: "absensi",
  "hr-office": "hr-office",
  report: "report",
  pengumuman: "pengumuman",
  lapangan: "lapangan",
  pengaturan: "pengaturan",
  ringkasan: "ringkasan",
} as const;
export type GoldName = keyof typeof GOLD_FILES;

/** Map existing line-icon names used in the nav to a gold medallion (others keep the line icon). */
const NAV_TO_GOLD: Partial<Record<IconName, GoldName>> = {
  home: "ringkasan",
  "calendar-check": "absensi",
  briefcase: "hr-office",
  receipt: "report",
  bell: "pengumuman",
  megaphone: "lapangan",
  sliders: "pengaturan",
};

export function GoldImg({ name, className = "w-6 h-6", busy = false }: { name: GoldName; className?: string; busy?: boolean }) {
  return (
    <Image unoptimized
      src={`/brand/${GOLD_FILES[name]}.png`}
      alt=""
      width={80}
      height={80}
      aria-hidden
      className={`${className} shrink-0 object-contain ${busy ? "animate-spin" : ""}`}
      style={{ mixBlendMode: "screen" }}
    />
  );
}

/** Drop-in replacement for <Icon/> in menus: gold medallion when one exists, else the line icon. */
export default function NavIcon({ name, className = "w-4 h-4 shrink-0" }: { name: IconName; className?: string }) {
  const g = NAV_TO_GOLD[name];
  if (g) return <GoldImg name={g} className="w-7 h-7" />;
  return <Icon name={name} className={className} />;
}
