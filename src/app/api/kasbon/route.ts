import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { fmtRp, dLabel } from "@/lib/format";
import { KASBON_LABEL, type KasbonStatus } from "@/lib/constants";

export async function GET() {
  try {
    const session = await requireSession(["KARYAWAN"]);
    const rows = await prisma.kasbon.findMany({
      where: { employeeId: session.employeeId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      kasbon: rows.map((k) => ({
        id: k.id,
        amountLabel: fmtRp(k.amount),
        reason: k.reason,
        status: KASBON_LABEL[k.status as KasbonStatus],
        note: k.note,
        dateLabel: dLabel(k.createdAt),
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN"]);
    const body = await req.json().catch(() => null);
    const amount = Math.round(Number(body?.amount));
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Nominal kasbon tidak valid." }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: "Alasan pengajuan wajib diisi." }, { status: 400 });
    }

    const kasbon = await prisma.kasbon.create({
      data: {
        employeeId: session.employeeId,
        amount,
        reason,
        status: "MENUNGGU_OWNER",
        note: "Belum ditinjau",
      },
    });

    return NextResponse.json({ ok: true, id: kasbon.id });
  } catch (e) {
    return apiError(e);
  }
}
