import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError, ApiAuthError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { SETTING_ID } from "@/lib/settings";

// Resets theme/font/logo back to AR Corp defaults. Gated by a passcode
// (RESET_PASSCODE, set only in Railway's environment variables — never
// committed to this public repo) that the Consultant holds, so anyone with
// office access can reach this button but still has to go ask the
// Consultant for the code before it does anything. Fails closed: if the
// server has no passcode configured, the reset simply refuses rather than
// falling back to some default anyone could read in the source.
export async function POST(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);

    const configured = process.env.RESET_PASSCODE;
    if (!configured) {
      throw new ApiAuthError(500, "RESET_PASSCODE belum diatur di server — hubungi Consultant untuk mengonfigurasinya.");
    }

    const body = await req.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code : "";
    if (code !== configured) {
      throw new ApiAuthError(403, "Kode salah — minta kode reset ke Consultant.");
    }

    await prisma.appSetting.upsert({
      where: { id: SETTING_ID },
      update: { themeColor: "classic", themeFont: "classic", logoDataUrl: null, logoUpdatedAt: null },
      create: { id: SETTING_ID },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
