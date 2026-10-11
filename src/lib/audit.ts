import "server-only";
import { prisma } from "./prisma";
import type { SessionPayload } from "./auth";
import type { AuditAction } from "./audit-format";

/**
 * Records one Riwayat Aktivitas row. Best-effort by design: it is called after the real action has already
 * succeeded, so a logging failure is only printed and never turns a successful save into an error.
 */
export async function logAudit(
  session: Pick<SessionPayload, "employeeId" | "name" | "accessRole">,
  action: AuditAction,
  target: string,
  detail?: string | null,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: session.employeeId,
        actorName: session.name,
        actorRole: session.accessRole,
        action,
        target,
        detail: detail || null,
      },
    });
  } catch (e) {
    console.error("[audit] failed to write:", e);
  }
}
