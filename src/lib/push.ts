import "server-only";
import webpush from "web-push";
import { prisma } from "./prisma";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails(VAPID_SUBJECT || "mailto:no-reply@arcorp.id", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

export function pushConfigured() {
  ensureConfigured();
  return configured;
}

/**
 * Sends one push payload to every device (PushSubscription row) an employee
 * is subscribed on. A 404/410 response means the browser/OS has permanently
 * dropped that subscription (uninstalled, permission revoked, etc.) — those
 * rows are deleted here rather than retried forever.
 */
export async function sendPushToEmployee(employeeId: string, payload: { title: string; body: string; url?: string }) {
  ensureConfigured();
  if (!configured) return { sent: 0, failed: 0 };

  const subs = await prisma.pushSubscription.findMany({ where: { employeeId } });
  let sent = 0;
  let failed = 0;
  const deadIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err) {
        failed++;
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) deadIds.push(sub.id);
        else console.error(`[push] failed to send to employee ${employeeId}:`, err);
      }
    })
  );

  if (deadIds.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: deadIds } } });
  }
  return { sent, failed };
}
