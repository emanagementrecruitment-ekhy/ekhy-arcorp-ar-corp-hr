import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError, ApiAuthError } from "@/lib/api-auth";
import { isLogoLocked, logoUnlockDate } from "@/lib/settings";

const EMPLOYEES = ["KARYAWAN", "SUPERVISOR"] as const;
const ALLOWED_TYPES = ["image/png", "image/webp", "image/jpeg"];
const MAX_BYTES = 1_500_000;

export async function GET() {
  try {
    const session = await requireSession([...EMPLOYEES]);
    const employee = await prisma.employee.findUniqueOrThrow({ where: { id: session.employeeId } });
    const locked = isLogoLocked(employee.photoUpdatedAt);
    return NextResponse.json({
      photoDataUrl: employee.photoDataUrl,
      locked,
      unlockAt: locked ? logoUnlockDate(employee.photoUpdatedAt) : null,
    });
  } catch (e) {
    return apiError(e);
  }
}

/** Self-service photo upload — first upload is always free, then locked 30 days (see /lib/settings.ts). Owner/Consultant can clear it early via /api/admin/employees/[id]/photo. */
export async function POST(req: Request) {
  try {
    const session = await requireSession([...EMPLOYEES]);
    const employee = await prisma.employee.findUniqueOrThrow({ where: { id: session.employeeId } });

    if (isLogoLocked(employee.photoUpdatedAt)) {
      const unlockAt = logoUnlockDate(employee.photoUpdatedAt)!;
      throw new ApiAuthError(
        409,
        `Foto baru saja diganti — bisa diganti lagi mulai ${unlockAt.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}.`
      );
    }

    const body = await req.json().catch(() => null);
    const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
    const match = dataUrl.match(/^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return NextResponse.json({ error: "Format foto tidak valid." }, { status: 400 });

    const [, mimeType, base64] = match;
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: "Gunakan PNG, WEBP, atau JPEG." }, { status: 400 });
    }
    const byteLength = Math.floor((base64.length * 3) / 4);
    if (byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Ukuran foto terlalu besar — maksimal 1.5 MB." }, { status: 400 });
    }

    await prisma.employee.update({
      where: { id: session.employeeId },
      data: { photoDataUrl: dataUrl, photoUpdatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
