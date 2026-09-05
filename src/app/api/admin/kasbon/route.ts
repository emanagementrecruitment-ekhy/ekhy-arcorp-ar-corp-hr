import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { fmtRp, dLabel, timeLabel } from "@/lib/format";
import { KASBON_LABEL, OFFICE_ROLES, type KasbonStatus } from "@/lib/constants";

export async function GET() {
  try {
    await requireSession(OFFICE_ROLES);
    const rows = await prisma.kasbon.findMany({
      include: { employee: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      kasbon: rows.map((k) => ({
        id: k.id,
        name: k.employee.name,
        code: k.employee.code,
        reason: k.reason,
        amountLabel: fmtRp(k.amount),
        status: KASBON_LABEL[k.status as KasbonStatus],
        pending: k.status === "MENUNGGU_OWNER",
        decided: k.status !== "MENUNGGU_OWNER",
        dateLabel: `${dLabel(k.createdAt)} · ${timeLabel(k.createdAt)}`,
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}
