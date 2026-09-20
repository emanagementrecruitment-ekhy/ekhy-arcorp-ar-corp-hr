type DeliveryStatus = "sent" | "skipped" | "failed";

/** Turns a {email, whatsapp} delivery result into one Indonesian status line for the UI. */
export function describePayslipDelivery(result: { email: DeliveryStatus; whatsapp: DeliveryStatus }): string {
  const sent: string[] = [];
  const failed: string[] = [];
  if (result.email === "sent") sent.push("email");
  if (result.email === "failed") failed.push("email");
  if (result.whatsapp === "sent") sent.push("WhatsApp");
  if (result.whatsapp === "failed") failed.push("WhatsApp");

  if (sent.length === 0 && failed.length === 0) {
    return "Belum ada kanal pengiriman (email/WhatsApp) yang aktif di server — hubungi vendor/penyedia aplikasi untuk mengaktifkannya.";
  }
  const parts: string[] = [];
  if (sent.length > 0) parts.push(`Terkirim ke ${sent.join(" & ")} terdaftar.`);
  if (failed.length > 0) parts.push(`Gagal mengirim ke ${failed.join(" & ")}.`);
  return parts.join(" ");
}
