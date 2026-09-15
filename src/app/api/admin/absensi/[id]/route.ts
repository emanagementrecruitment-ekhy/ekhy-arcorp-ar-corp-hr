import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";

/** Only Owner/Consultant may erase a self-check-in mark — narrower than the usual OFFICE_ROLES (Admin Pusat excluded), per explicit requirement. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["OWNER", "CONSULTANT"]);
    const { id } = await params;

    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Catatan absensi tidak ditemukan." }, { status: 404 });

    await prisma.attendance.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
