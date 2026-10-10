import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";

// Admin Pusat only moves the money; Owner/Manager may also mark it (e.g. when they transfer it themselves).
const TRANSFERRERS = ["ADMIN_PUSAT", "OWNER", "CONSULTANT", "MANAGER"] as const;

/** Marks an already-approved kasbon as transferred. A kasbon that was not approved can never be marked. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession([...TRANSFERRERS]);
    const { id } = await params;

    // The status and "not yet transferred" are part of the write, so a double tap marks it once.
    const { count } = await prisma.kasbon.updateMany({
      where: { id, status: "DISETUJUI", transferredAt: null },
      data: { transferredAt: new Date(), transferredByName: session.name },
    });
    if (count === 0) {
      const existing = await prisma.kasbon.findUnique({ where: { id }, select: { status: true } });
      if (!existing) return NextResponse.json({ error: "Pengajuan kasbon tidak ditemukan." }, { status: 404 });
      if (existing.status !== "DISETUJUI") {
        return NextResponse.json({ error: "Kasbon ini belum disetujui Owner/Manager, jadi belum boleh ditransfer." }, { status: 409 });
      }
      return NextResponse.json({ error: "Kasbon ini sudah ditandai ditransfer." }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
