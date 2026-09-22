import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OWNER_ACCOUNT_CODE, HQ } from "@/lib/constants";
import { normalizeIdentifier } from "@/lib/lookup";
import { SETTING_ID } from "@/lib/settings";
import { licensingConfigured, validateActivationCode } from "@/lib/license";

// Deliberately narrower than OFFICE_ROLES: MANAGER is equal to OWNER
// everywhere else in the app, but must never see (let alone edit) the real
// Owner's Name/Email/HP — the one carve-out to "kesetaraan owner".
const IDENTITY_VIEWERS = ["OWNER", "CONSULTANT", "ADMIN_PUSAT"] as const;

export async function GET() {
  try {
    const session = await requireSession([...IDENTITY_VIEWERS]);
    const [owner, setting] = await Promise.all([
      prisma.employee.findUnique({ where: { code: OWNER_ACCOUNT_CODE } }),
      prisma.appSetting.findUnique({ where: { id: SETTING_ID } }),
    ]);

    return NextResponse.json({
      generated: Boolean(setting?.ownerGeneratedAt),
      generatedAt: setting?.ownerGeneratedAt ?? null,
      name: owner?.name ?? null,
      email: owner?.email ?? null,
      phone: owner?.phone ?? null,
      logoDataUrl: setting?.ownerLogoDataUrl ?? null,
      canEdit: session.accessRole === "CONSULTANT",
      // Only the very first "generate & patenkan" for a deployment needs an
      // activation code (see /lib/license.ts) — once ownerGeneratedAt is
      // set, this instance is already locked to that client, and later
      // replaces via "Ganti Owner" don't ask for a code again.
      needsActivationCode: licensingConfigured() && !setting?.ownerGeneratedAt,
    });
  } catch (e) {
    return apiError(e);
  }
}

/** Consultant-only: (re)generates the single Owner account's Name/Email/HP. Locked for everyone else once set — see /dev/nav-layout. */
export async function POST(req: Request) {
  try {
    await requireSession(["CONSULTANT"]);
    const body = await req.json().catch(() => null);

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const emailRaw = typeof body?.email === "string" ? body.email.trim() : "";
    const phoneRaw = typeof body?.phone === "string" ? body.phone.trim() : "";
    const activationCode = typeof body?.activationCode === "string" ? body.activationCode.trim() : "";

    if (!name) return NextResponse.json({ error: "Nama Owner wajib diisi." }, { status: 400 });
    const email = normalizeIdentifier(emailRaw);
    if (email.kind !== "email" || !email.value.includes(".")) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }
    const phone = normalizeIdentifier(phoneRaw);
    if (phone.kind !== "phone" || phone.value.length < 9) {
      return NextResponse.json({ error: "Nomor HP tidak valid." }, { status: 400 });
    }

    const [emailTaken, phoneTaken, currentSetting] = await Promise.all([
      prisma.employee.findFirst({ where: { email: email.value, code: { not: OWNER_ACCOUNT_CODE } } }),
      prisma.employee.findFirst({ where: { phone: phone.value, code: { not: OWNER_ACCOUNT_CODE } } }),
      prisma.appSetting.findUnique({ where: { id: SETTING_ID } }),
    ]);
    if (emailTaken) return NextResponse.json({ error: "Email sudah dipakai akun lain." }, { status: 409 });
    if (phoneTaken) return NextResponse.json({ error: "Nomor HP sudah dipakai akun lain." }, { status: 409 });

    const isFirstGenerate = !currentSetting?.ownerGeneratedAt;
    if (isFirstGenerate && licensingConfigured()) {
      if (!activationCode) {
        return NextResponse.json({ error: "Kode aktivasi dari vendor wajib diisi." }, { status: 400 });
      }
      const licenseCheck = await validateActivationCode(activationCode);
      if (!licenseCheck.ok) {
        return NextResponse.json({ error: licenseCheck.error ?? "Kode aktivasi tidak valid." }, { status: 403 });
      }
    }

    await prisma.$transaction([
      prisma.employee.upsert({
        where: { code: OWNER_ACCOUNT_CODE },
        update: { name, email: email.value, phone: phone.value },
        create: {
          code: OWNER_ACCOUNT_CODE,
          name,
          email: email.value,
          phone: phone.value,
          role: "Owner",
          accessRole: "OWNER",
          homeLat: HQ.lat,
          homeLng: HQ.lng,
          homePlace: "Kantor Pusat Jakarta",
        },
      }),
      // Reset so the (possibly new) Owner sees the welcome screen again next login.
      prisma.appSetting.upsert({
        where: { id: SETTING_ID },
        update: { ownerGeneratedAt: new Date(), ownerWelcomeSeenAt: null },
        create: { id: SETTING_ID, ownerGeneratedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
