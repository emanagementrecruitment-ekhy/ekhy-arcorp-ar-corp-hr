import "server-only";
import { prisma } from "./prisma";
import { NOTIFY_ROLES } from "./constants";

/**
 * Broadcasts one notification to every office-tier role (Owner, Consultant,
 * Admin Pusat, Kepala Mess) — see NOTIFY_ROLES. Notification.recipientRole
 * is a single role per row (see the model comment in schema.prisma), so a
 * broadcast is literally one row per role.
 */
export async function notifyOffice(text: string) {
  await prisma.notification.createMany({
    data: NOTIFY_ROLES.map((recipientRole) => ({ recipientRole, text })),
  });
}
