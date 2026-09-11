import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { fmtRp } from "@/lib/format";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["OWNER"]);
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const approve = body?.approve === true;
    const editedAmountRaw = Number(body?.amount);
    const hasEditedAmount = approve && Number.isFinite(editedAmountRaw) && editedAmountRaw > 0;

    const existing = await prisma.kasbon.findUnique({ where: { id }, include: { employee: true } });
    if (!existing) {
      return NextResponse.json({ error: "Pengajuan kasbon tidak ditemukan." }, { status: 404 });
    }
    if (existing.status !== "MENUNGGU_OWNER") {
      return NextResponse.json({ error: "Pengajuan ini sudah diputuskan." }, { status: 409 });
    }

    const finalAmount = hasEditedAmount ? Math.round(editedAmountRaw) : existing.amount;
    const amountChanged = hasEditedAmount && finalAmount !== existing.amount;

    await prisma.kasbon.update({
      where: { id },
      data: {
        amount: finalAmount,
        status: approve ? "DISETUJUI" : "DITOLAK",
        decidedById: session.employeeId,
        decidedAt: new Date(),
        note: approve
          ? amountChanged
            ? `Disetujui Owner · nominal diubah dari ${fmtRp(existing.amount)} jadi ${fmtRp(finalAmount)} · dipotong pencairan voucher berikutnya`
            : "Disetujui Owner · dipotong pencairan voucher berikutnya"
          : "Ditolak Owner",
      },
    });

    if (approve) {
      await prisma.notification.create({
        data: { recipientRole: "ADMIN_PUSAT", text: `Kasbon ${existing.employee.name} disetujui Owner.` },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
