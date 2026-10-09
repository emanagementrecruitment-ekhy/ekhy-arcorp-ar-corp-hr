/** "budi.santoso@gmail.com" -> "bu***@gmail.com" — enough to recognise the inbox, not enough to harvest it. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  return `${local.slice(0, Math.min(2, local.length))}***${email.slice(at)}`;
}
