import type { ReactNode } from "react";

/**
 * Line icons for the AR Corp design system: 24px grid, 1.6 stroke, round caps,
 * drawn in currentColor so they follow the text color (dim, gold, gold2).
 */
const PATHS = {
  home: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5h13V10" />
      <path d="M10 19.5v-5h4v5" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z" />
      <path d="M14 6v12" strokeDasharray="2 2" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5h14a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M4 7.5 15 4v3.5" />
      <circle cx="16.5" cy="13.5" r="1" />
    </>
  ),
  flag: (
    <>
      <path d="M6 21V4" />
      <path d="M6 4.5h11l-2 4 2 4H6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  "calendar-check": (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
      <path d="m9 15 2.2 2.2L15.5 13" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 21h4" />
    </>
  ),
  "user-plus": (
    <>
      <circle cx="10" cy="8.5" r="3.5" />
      <path d="M3.5 20c0-3.4 2.9-5.8 6.5-5.8" />
      <path d="M18 14v6M15 17h6" />
    </>
  ),
  "id-card": (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <circle cx="9" cy="11.5" r="2" />
      <path d="M6 16c.5-1.6 1.7-2.3 3-2.3s2.5.7 3 2.3M14.5 10.5H18M14.5 14H18" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9.5" r="2.3" />
      <path d="M17 14c2.5 0 4.3 1.6 4.3 4" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17" />
    </>
  ),
  archive: (
    <>
      <rect x="3.5" y="4.5" width="17" height="4.5" rx="1" />
      <path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12.5 16V8M17 16v-6" />
    </>
  ),
  "tray-in": (
    <>
      <path d="M12 4v10M8 10.5l4 4 4-4" />
      <path d="M5 18.5h14" />
    </>
  ),
  banknote: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 10v4M17.5 10v4" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" />
      <path d="M9 8.5h6M9 12h6M9 15.5h3" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4h3l7 4V6L7 10z" />
      <path d="M17.5 9.5a4 4 0 0 1 0 5" />
    </>
  ),
  sliders: (
    <>
      <path d="M5 7h9M18 7h1M5 17h1M10 17h9" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, className = "w-[18px] h-[18px]" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
