import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(OFFICE_ROLES);
    const { id } = await params;

    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) return NextResponse.json({ error: "Pengingat tidak ditemukan." }, { status: 404 });
    // Once sent, the row is the only record of what was actually pushed to
    // employees' phones — deleting it would erase that history, so only an
    // unsent (still-scheduled) reminder can be cancelled.
    if (reminder.sentAt) {
      return NextResponse.json({ error: "Pengingat yang sudah terkirim tidak bisa dihapus." }, { status: 409 });
    }

    await prisma.reminder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
