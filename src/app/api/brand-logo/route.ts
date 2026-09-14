import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { SETTING_ID } from "@/lib/settings";

// Public — every logged-out login page and every logged-in page's header
// loads this. Serves the uploaded logo (see /api/admin/settings/logo) when
// one exists, otherwise falls back to the shipped default mark, so every
// place in the app that shows the brand mark can point at this single URL
// instead of a static file path and pick up a change immediately.
//
// A bare GET with no cookies()/headers() call is otherwise eligible for
// Next's build-time static generation — which would either bake in
// whatever the build container's (nonexistent) database returns, or fail
// the build outright the way the root layout's DB read did. force-dynamic
// keeps this reading the real database on every request instead.
export const dynamic = "force-dynamic";

export async function GET() {
  const setting = await prisma.appSetting.findUnique({ where: { id: SETTING_ID } });
  const match = setting?.logoDataUrl?.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);

  if (match) {
    const [, mimeType, base64] = match;
    return new Response(Buffer.from(base64, "base64"), {
      headers: { "Content-Type": mimeType, "Cache-Control": "no-cache" },
    });
  }

  const defaultMark = await readFile(path.join(process.cwd(), "public", "ar-corp-logo.png"));
  return new Response(defaultMark, {
    headers: { "Content-Type": "image/png", "Cache-Control": "no-cache" },
  });
}
