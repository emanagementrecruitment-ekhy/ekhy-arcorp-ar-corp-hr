import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";

const MANAGERS = ["OWNER", "CONSULTANT", "MANAGER"] as const;
const ALLOWED_TYPES = ["image/png", "image/webp", "image/jpeg"];
const MAX_BYTES = 1_500_000;

/** Owner/Consultant override — replaces an employee's self-service photo directly, bypassing their 30-day lock and restarting it so they can't immediately overwrite the admin's pick. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession([...MANAGERS]);
    const { id } = await params;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing || existing.accessRole !== "KARYAWAN") {
      return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
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
      where: { id },
      data: { photoDataUrl: dataUrl, photoUpdatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

/** Clears the photo and its lock, so the employee can freely upload a fresh one right away. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession([...MANAGERS]);
    const { id } = await params;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing || existing.accessRole !== "KARYAWAN") {
      return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    }

    await prisma.employee.update({ where: { id }, data: { photoDataUrl: null, photoUpdatedAt: null } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
