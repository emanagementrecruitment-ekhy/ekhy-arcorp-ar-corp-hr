// ONE place to rename the app for a client. Values come from environment variables
// (NEXT_PUBLIC_BRAND_*), so every client runs the SAME code and only sets its own env.
// Defaults = AR Corporation. NEXT_PUBLIC_* values are inlined at build time (set before Deploy).
// Plain strings only (no server code) so both server and client components can import it.
export const BRAND = {
  /** Full company name — privacy page, emails, AI assistant, metadata. */
  company: process.env.NEXT_PUBLIC_BRAND_COMPANY || "AR Corporation",
  /** Short name — sidebar, logo alt text, OTP emails, PDF header (UPPERCASE is applied where needed). */
  short: process.env.NEXT_PUBLIC_BRAND_SHORT || "AR Corp",
  /** Product title on the login page and browser tab. FIXED (AR Corporation build) for every client — not env-driven. */
  product: "E-Management",
  /** Small line under the product title on the login page. */
  subtitle: "Portal operasional · Slip pay",
  /** Three-word slogan at the bottom of the login page. */
  slogan: "Good Grip, Profesional, Trusted",
  /** Public contact shown on the privacy page and in the assistant. */
  email: process.env.NEXT_PUBLIC_BRAND_EMAIL || "official.arcorporation@gmail.com",
  websiteHost: process.env.NEXT_PUBLIC_BRAND_WEBSITE_HOST || "www.officialarcorporation.my.id",
  /** Call-center / HR phone shown by the assistant. */
  phone: process.env.NEXT_PUBLIC_BRAND_PHONE || "0881-02545-8888",
};

/**
 * FIXED copyright / "made by" identity of the vendor. NEVER read from env and NEVER
 * changed per client — it is shown on the Pusat Sistem copyright plate for every client.
 */
export const VENDOR = {
  company: "AR Corporation",
  short: "AR Corp",
  email: "official.arcorporation@gmail.com",
  websiteHost: "www.officialarcorporation.my.id",
  phone: "0881-02545-8888",
} as const;
