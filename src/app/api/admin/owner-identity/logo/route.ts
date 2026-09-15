import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { SETTING_ID } from "@/lib/settings";

// Owner's own decorative logo on /dev/nav-layout — deliberately separate
// from the main brand logo (see /api/admin/settings/logo): changing this
// one never touches the login screen, sidebar, or Slip Pay branding. No
// 30-day lock either, since it's a personal touch rather than the company
// identity that lock exists to protect.
const ALLOWED_TYPES = ["image/png", "image/svg+xml", "image/webp", "image/jpeg"];
const MAX_BYTES = 1_500_000;

export async function POST(req: Request) {
  try {
    await requireSession(["OWNER", "CONSULTANT"]);
    const body = await req.json().catch(() => null);
    const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
    const match = dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return NextResponse.json({ error: "Format gambar tidak valid." }, { status: 400 });

    const [, mimeType, base64] = match;
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: "Gunakan PNG, SVG, WEBP, atau JPEG." }, { status: 400 });
    }
    const byteLength = Math.floor((base64.length * 3) / 4);
    if (byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Ukuran gambar terlalu besar — maksimal 1.5 MB." }, { status: 400 });
    }

    await prisma.appSetting.upsert({
      where: { id: SETTING_ID },
      update: { ownerLogoDataUrl: dataUrl },
      create: { id: SETTING_ID, ownerLogoDataUrl: dataUrl },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
