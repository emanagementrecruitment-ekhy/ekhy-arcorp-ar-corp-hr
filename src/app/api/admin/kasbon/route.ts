import { NextResponse } from "next/server";
import { EMPLOYEE_NO_PHOTO } from "@/lib/employee-select";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { fmtRp, dLabel, timeLabel } from "@/lib/format";
import { KASBON_LABEL, OFFICE_ROLES, type KasbonStatus } from "@/lib/constants";
import { kasbonKindFor } from "@/lib/kasbon-kind";

export async function GET() {
  try {
    await requireSession(OFFICE_ROLES);
    const rows = await prisma.kasbon.findMany({
      include: { employee: { select: EMPLOYEE_NO_PHOTO } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      kasbon: rows.map((k) => ({
        id: k.id,
        name: k.employee.name,
        code: k.employee.code,
        reason: k.reason,
        amount: k.amount,
        amountLabel: fmtRp(k.amount),
        status: KASBON_LABEL[k.status as KasbonStatus],
        kind: kasbonKindFor(k.employee.role),
        pending: k.status === "MENUNGGU_OWNER",
        approved: k.status === "DISETUJUI",
        // Approved by Owner/Manager but the money has not been sent yet — Admin Pusat's turn.
        awaitingTransfer: k.status === "DISETUJUI" && !k.transferredAt,
        transferredLabel: k.transferredAt
          ? `Ditransfer ${k.transferredByName ? "oleh " + k.transferredByName + " · " : ""}${dLabel(k.transferredAt)} · ${timeLabel(k.transferredAt)}`
          : "",
        decided: k.status !== "MENUNGGU_OWNER",
        dateLabel: `${dLabel(k.createdAt)} · ${timeLabel(k.createdAt)}`,
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}
