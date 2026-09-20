import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { fmtRp } from "@/lib/format";

const APPROVERS = ["OWNER", "CONSULTANT"] as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession([...APPROVERS]);
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
    // CONSULTANT is the vendor's own reserved support tier — its decisions
    // are recorded and shown identically to Owner's so the label never
    // surfaces a role a client didn't ask for and wouldn't recognize.
    const deciderLabel = "Owner";

    // Guard the write with the status it was read under, so a double-tap or
    // Owner-and-Consultant both deciding at once can only ever apply once —
    // the loser's update touches zero rows instead of silently overwriting
    // the winner's decision and sending a second notification.
    const { count } = await prisma.kasbon.updateMany({
      where: { id, status: "MENUNGGU_OWNER" },
      data: {
        amount: finalAmount,
        status: approve ? "DISETUJUI" : "DITOLAK",
        decidedById: session.employeeId,
        decidedAt: new Date(),
        note: approve
          ? amountChanged
            ? `Disetujui ${deciderLabel} · nominal diubah dari ${fmtRp(existing.amount)} jadi ${fmtRp(finalAmount)} · dipotong pencairan voucher berikutnya`
            : `Disetujui ${deciderLabel} · dipotong pencairan voucher berikutnya`
          : `Ditolak ${deciderLabel}`,
      },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Pengajuan ini sudah diputuskan." }, { status: 409 });
    }

    if (approve) {
      await prisma.notification.create({
        data: { recipientRole: "ADMIN_PUSAT", text: `Kasbon ${existing.employee.name} disetujui ${deciderLabel}.` },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
