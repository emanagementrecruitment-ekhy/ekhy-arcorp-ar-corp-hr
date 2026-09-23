import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError, ApiAuthError } from "@/lib/api-auth";
import { SETTING_ID, getAppearanceSetting, isLogoLocked, logoUnlockDate } from "@/lib/settings";

const MANAGERS = ["OWNER", "CONSULTANT", "MANAGER"] as const;
const ALLOWED_TYPES = ["image/png", "image/svg+xml", "image/webp", "image/jpeg"];
const MAX_BYTES = 1_500_000; // raw image bytes, well under what fits comfortably in a DB row

export async function POST(req: Request) {
  try {
    const session = await requireSession([...MANAGERS]);
    const setting = await getAppearanceSetting();

    if (isLogoLocked(setting.logoUpdatedAt)) {
      const unlockAt = logoUnlockDate(setting.logoUpdatedAt)!;
      throw new ApiAuthError(
        409,
        `Logo baru saja diganti — bisa diganti lagi mulai ${unlockAt.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}.`
      );
    }

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

    const now = new Date();
    await prisma.appSetting.upsert({
      where: { id: SETTING_ID },
      update: { logoDataUrl: dataUrl, logoUpdatedAt: now, logoUpdatedById: session.employeeId },
      create: { id: SETTING_ID, logoDataUrl: dataUrl, logoUpdatedAt: now, logoUpdatedById: session.employeeId },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

// A password-gated full reset (theme + font + logo) lives at
// /api/admin/settings/reset instead of here — deliberately not a DELETE on
// this route, since that would let anyone with logo-management access
// clear it with no passcode, bypassing the whole point of gating the reset
// behind a code only the Consultant hands out.
