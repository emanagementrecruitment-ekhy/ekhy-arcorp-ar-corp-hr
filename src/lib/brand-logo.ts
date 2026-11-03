import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma";
import { SETTING_ID } from "./settings";

/**
 * The company logo as a PNG/JPEG buffer that pdfkit can embed (it cannot read WebP or SVG).
 * Uses the logo this client uploaded in Pengaturan Tampilan, otherwise the shipped default mark, so a
 * Slip Pay watermark always follows the company/agency that runs this app. Returns null if nothing
 * usable could be read (the caller then keeps the slip without a watermark).
 */
export async function loadPdfLogo(): Promise<Buffer | null> {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { id: SETTING_ID }, select: { logoDataUrl: true } });
    const match = setting?.logoDataUrl?.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
    if (match) {
      const [, mime, b64] = match;
      const raw = Buffer.from(b64, "base64");
      if (mime === "image/png" || mime === "image/jpeg") return raw;
      try {
        const sharp = (await import("sharp")).default;
        return await sharp(raw, { density: 200 }).png().toBuffer();
      } catch {
        // cannot convert WebP/SVG here: fall through to the default mark rather than a wrong watermark
      }
    }
    return await readFile(path.join(process.cwd(), "public", "ar-corp-logo.png"));
  } catch {
    return null;
  }
}
