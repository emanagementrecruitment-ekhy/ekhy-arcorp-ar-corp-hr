import { BRAND } from "@/lib/brand";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";
import { getAppearanceSetting } from "@/lib/settings";
import { LIGHT_MODE_DAY_START_HOUR, LIGHT_MODE_DAY_END_HOUR, COMPANY_DESCRIPTION } from "@/lib/constants";
import LightModeSync from "@/components/LightModeSync";

// Self-hosted variable fonts (see ./fonts/README.md) — no network fetch at build time.
const displayClassic = localFont({
  src: "./fonts/cormorant-garamond-latin-wght-normal.woff2",
  variable: "--font-display-classic",
  weight: "300 700",
  display: "swap",
});
const sansClassic = localFont({
  src: "./fonts/manrope-latin-wght-normal.woff2",
  variable: "--font-sans-classic",
  weight: "200 800",
  display: "swap",
});

const displayModern = localFont({
  src: "./fonts/playfair-display-latin-wght-normal.woff2",
  variable: "--font-display-modern",
  weight: "400 900",
  display: "swap",
});
const sansModern = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-sans-modern",
  weight: "100 900",
  display: "swap",
});

const displayBold = localFont({
  src: "./fonts/montserrat-latin-wght-normal.woff2",
  variable: "--font-display-bold",
  weight: "100 900",
  display: "swap",
});
const sansBold = localFont({
  src: "./fonts/work-sans-latin-wght-normal.woff2",
  variable: "--font-sans-bold",
  weight: "100 900",
  display: "swap",
});

// Sidebar-only fonts (see ./fonts/README.md): the "AR CORP" wordmark and the role label.
const fontIso = localFont({
  src: "./fonts/3DIsometric-Bold.ttf",
  variable: "--font-iso",
  weight: "700",
  display: "swap",
});
const fontUnique = localFont({
  src: "./fonts/Unique.ttf",
  variable: "--font-unique",
  weight: "400",
  display: "swap",
});

const fontVariables = [
  fontIso.variable,
  fontUnique.variable,
  displayClassic.variable,
  sansClassic.variable,
  displayModern.variable,
  sansModern.variable,
  displayBold.variable,
  sansBold.variable,
].join(" ");

export const metadata: Metadata = {
  title: `${BRAND.short} · ${BRAND.product}`,
  description: COMPANY_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: `${BRAND.short}`,
  },
};

export const viewport: Viewport = {
  themeColor: "#07080b",
};

// The root layout now reads the appearance setting from the database on
// every request (see getAppearanceSetting below) so a saved theme/font
// change applies immediately without a rebuild. Next would otherwise try to
// prerender pages like /app at BUILD time, when the SQLite volume isn't
// mounted yet — force-dynamic keeps every page rendered per-request, which
// this app already needs anyway since nearly every page reads the session
// cookie.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { themeColor, themeFont, lightMode } = await getAppearanceSetting();
  // Server has no reliable read on the visitor's own timezone, so "auto"
  // renders as "dark" here (today's fixed look) — the beforeInteractive
  // script below corrects it from the browser's real local clock before
  // the very first paint, so there's no visible flash either way.
  const initialMode = lightMode === "auto" ? "dark" : lightMode;

  return (
    <html lang="id" data-theme={themeColor} data-font={themeFont} data-mode={initialMode} data-mode-pref={lightMode} className={fontVariables}>
      <head>
        <Script id="light-mode-init" strategy="beforeInteractive">
          {`(function(){try{var pref=document.documentElement.getAttribute('data-mode-pref');if(pref==='auto'){var h=new Date().getHours();var mode=(h>=${LIGHT_MODE_DAY_START_HOUR}&&h<${LIGHT_MODE_DAY_END_HOUR})?'light':'dark';document.documentElement.setAttribute('data-mode',mode);}}catch(e){}})();`}
        </Script>
      </head>
      <body className="min-h-screen bg-ar-bg text-ar-text font-sans antialiased">
        <LightModeSync lightMode={lightMode} />
        {children}
      </body>
    </html>
  );
}
