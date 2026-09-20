import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError, ApiAuthError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { SETTING_ID } from "@/lib/settings";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Resets theme/font/logo back to AR Corp defaults. Gated by a passcode
// (RESET_PASSCODE, set only in Railway's environment variables — never
// committed to this public repo) that the Consultant holds, so anyone with
// office access can reach this button but still has to go ask the
// Consultant for the code before it does anything. Fails closed: if the
// server has no passcode configured, the reset simply refuses rather than
// falling back to some default anyone could read in the source.
export async function POST(req: Request) {
  try {
    const session = await requireSession(OFFICE_ROLES);

    // Any office-tier account can reach this button, so the passcode is the
    // only thing standing between "logged in" and "reset branding" — cap
    // guesses per account on top of requiring the Consultant's code at all.
    if (!rateLimit(`settings-reset:${session.employeeId}`, 5, 10 * 60_000) || !rateLimit(`settings-reset:ip:${clientIp(req)}`, 10, 10 * 60_000)) {
      throw new ApiAuthError(429, "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.");
    }

    const configured = process.env.RESET_PASSCODE;
    if (!configured) {
      throw new ApiAuthError(500, "RESET_PASSCODE belum diatur di server — hubungi vendor/penyedia aplikasi untuk mengonfigurasinya.");
    }

    const body = await req.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code : "";
    if (code !== configured) {
      throw new ApiAuthError(403, "Kode salah — minta kode reset ke vendor/penyedia aplikasi.");
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
