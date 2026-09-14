import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES, THEME_COLOR_IDS, THEME_FONT_IDS, THEME_COLORS, THEME_FONTS } from "@/lib/constants";
import { SETTING_ID, getAppearanceSetting, logoUnlockDate, isLogoLocked } from "@/lib/settings";

const LOGO_MANAGERS = ["OWNER", "CONSULTANT"] as const;

export async function GET() {
  try {
    const session = await requireSession(OFFICE_ROLES);
    const setting = await getAppearanceSetting();
    const unlockAt = logoUnlockDate(setting.logoUpdatedAt);

    return NextResponse.json({
      themeColor: setting.themeColor,
      themeFont: setting.themeFont,
      themeColors: THEME_COLORS,
      themeFonts: THEME_FONTS,
      logo: {
        hasCustom: Boolean(setting.logoDataUrl),
        updatedAt: setting.logoUpdatedAt,
        unlockAt,
        locked: isLogoLocked(setting.logoUpdatedAt),
        canManage: (LOGO_MANAGERS as readonly string[]).includes(session.accessRole),
      },
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const body = await req.json().catch(() => null);
    const themeColor = typeof body?.themeColor === "string" ? body.themeColor : undefined;
    const themeFont = typeof body?.themeFont === "string" ? body.themeFont : undefined;

    if (themeColor !== undefined && !THEME_COLOR_IDS.includes(themeColor as (typeof THEME_COLOR_IDS)[number])) {
      return NextResponse.json({ error: "Warna tema tidak dikenali." }, { status: 400 });
    }
    if (themeFont !== undefined && !THEME_FONT_IDS.includes(themeFont as (typeof THEME_FONT_IDS)[number])) {
      return NextResponse.json({ error: "Font tidak dikenali." }, { status: 400 });
    }

    await prisma.appSetting.upsert({
      where: { id: SETTING_ID },
      update: { ...(themeColor && { themeColor }), ...(themeFont && { themeFont }) },
      create: { id: SETTING_ID, themeColor: themeColor ?? "classic", themeFont: themeFont ?? "classic" },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
