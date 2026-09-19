import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Manrope, Playfair_Display, Inter, Montserrat, Work_Sans } from "next/font/google";
import "./globals.css";
import { getAppearanceSetting } from "@/lib/settings";
import { LIGHT_MODE_DAY_START_HOUR, LIGHT_MODE_DAY_END_HOUR } from "@/lib/constants";
import LightModeSync from "@/components/LightModeSync";

const displayClassic = Cormorant_Garamond({
  variable: "--font-display-classic",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const sansClassic = Manrope({
  variable: "--font-sans-classic",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const displayModern = Playfair_Display({
  variable: "--font-display-modern",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const sansModern = Inter({
  variable: "--font-sans-modern",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const displayBold = Montserrat({
  variable: "--font-display-bold",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});
const sansBold = Work_Sans({
  variable: "--font-sans-bold",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const fontVariables = [
  displayClassic.variable,
  sansClassic.variable,
  displayModern.variable,
  sansModern.variable,
  displayBold.variable,
  sansBold.variable,
].join(" ");

export const metadata: Metadata = {
  title: "AR Corp · E-Management",
  description: "Portal operasional AR Corp — absensi GPS, voucher komisi, dan kasbon karyawan.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AR Corp",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
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
