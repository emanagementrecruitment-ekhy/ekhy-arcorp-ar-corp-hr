import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { SETTING_ID } from "@/lib/settings";

// Public — every logged-out login page and every logged-in page's header
// loads this. Serves the uploaded logo (see /api/admin/settings/logo) when
// one exists, otherwise falls back to the shipped default mark, so every
// place in the app that shows the brand mark can point at this single URL
// instead of a static file path and pick up a change immediately.
export async function GET() {
  const setting = await prisma.appSetting.findUnique({ where: { id: SETTING_ID } });
  const match = setting?.logoDataUrl?.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);

  if (match) {
    const [, mimeType, base64] = match;
    return new Response(Buffer.from(base64, "base64"), {
      headers: { "Content-Type": mimeType, "Cache-Control": "no-cache" },
    });
  }

  const defaultMark = await readFile(path.join(process.cwd(), "public", "dear-mark.svg"));
  return new Response(defaultMark, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" },
  });
}
