// ONE place to rename the app for a client. Edit the values below, commit, redeploy.
// Plain strings only (no server code) so both server and client components can import it.
export const BRAND = {
  /** Full company name — privacy page, emails, AI assistant, metadata. */
  company: "Unicorn Management",
  /** Short name — sidebar, logo alt text, OTP emails, PDF header (UPPERCASE is applied where needed). */
  short: "Unicorn",
  /** Product title on the login page and browser tab. */
  product: "E-Management",
  /** Small line under the product title on the login page. */
  subtitle: "Portal operasional · Slip pay",
  /** Three-word slogan at the bottom of the login page. */
  slogan: "Professional · Trusted · Together",
  /** Public contact shown on the privacy page and in the assistant. Change to the client's real contact. */
  email: "hr@unicornmanagement.id",
  websiteHost: "unicornmanagement.id",
  /** Call-center / HR phone shown by the assistant. */
  phone: "0000-0000-0000",
} as const;
