import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { auditActionLabel, auditRoleLabel, AUDIT_ACTIONS } from "@/lib/audit-format";

// Owner only (CONSULTANT is the vendor tier shown as Owner) — Manager and everyone else are refused.
const VIEWERS = ["OWNER", "CONSULTANT"] as const;
const PAGE_SIZE = 25;

/** Riwayat Aktivitas — newest first, optional ?action= filter and ?page=. Owner only. */
export async function GET(req: Request) {
  try {
    await requireSession([...VIEWERS]);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") ?? "";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const where = action && action in AUDIT_ACTIONS ? { action } : {};

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { at: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      total,
      page,
      pageSize: PAGE_SIZE,
      actions: Object.entries(AUDIT_ACTIONS).map(([id, label]) => ({ id, label })),
      rows: rows.map((r) => ({
        id: r.id,
        at: r.at,
        actor: r.actorName,
        role: auditRoleLabel(r.actorRole),
        action: auditActionLabel(r.action),
        target: r.target,
        detail: r.detail,
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}
