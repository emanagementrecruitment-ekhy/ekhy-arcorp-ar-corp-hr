// What "Kirim ke kantor" in the Ara assistant writes into the employee's chat thread (the same ChatMessage thread
// the Lapor page and the admin "Lapor Lapangan" page use), so Owner/Admin can answer there.

const FORWARD_PREFIX = "Lewat asisten Ara: ";

/** The employee's own words, marked so the office knows it came through Ara. */
export function forwardedChatText(message: string): string {
  return `${FORWARD_PREFIX}${message.trim()}`;
}

/**
 * A fixed (not AI-written) receipt shown in the thread right after the forwarded message. It only confirms that the
 * message arrived and says who will answer — it never answers the request itself.
 */
export const AUTO_RECEIPT_TEXT =
  "Balasan otomatis: pesanmu sudah diterima kantor. Jawaban pastinya akan diberikan langsung oleh Owner/Admin di sini, bukan oleh AI.";
