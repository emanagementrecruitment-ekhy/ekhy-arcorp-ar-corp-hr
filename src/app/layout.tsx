import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope, Playfair_Display, Inter, Montserrat, Work_Sans } from "next/font/google";
import "./globals.css";
import { getAppearanceSetting } from "@/lib/settings";

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
  title: "DEAR Management",
  description: "Portal operasional DEAR Management — absensi GPS, voucher komisi, dan kasbon karyawan.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DEAR Management",
  },
};

export const viewport: Viewport = {
  themeColor: "#050508",
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
  const { themeColor, themeFont } = await getAppearanceSetting();

  return (
    <html lang="id" data-theme={themeColor} data-font={themeFont} className={fontVariables}>
      <body className="min-h-screen bg-ar-bg text-ar-text font-sans antialiased">{children}</body>
    </html>
  );
}
