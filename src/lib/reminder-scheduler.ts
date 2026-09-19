import "server-only";
import { prisma } from "./prisma";
import { sendPushToEmployee, pushConfigured } from "./push";

/**
 * Runs on an interval from src/instrumentation.ts (the whole app is a single
 * long-lived `next start` process on Railway, not serverless — so an
 * in-process interval is simpler and more reliable here than wiring up an
 * external cron service). Picks up every Reminder whose scheduledAt has
 * passed and hasn't been sent yet, pushes it to each recipient's devices,
 * and stamps sentAt so it's never picked up twice.
 */
export async function processDueReminders() {
  if (!pushConfigured()) return;

  const due = await prisma.reminder.findMany({
    where: { sentAt: null, scheduledAt: { lte: new Date() } },
    include: { recipients: true },
  });

  for (const reminder of due) {
    // Stamp sentAt first — a push mid-send crash must not leave the reminder
    // eligible to be picked up again and double-notify everyone on restart.
    await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: new Date() } });

    for (const recipient of reminder.recipients) {
      try {
        const { sent } = await sendPushToEmployee(recipient.employeeId, {
          title: reminder.title,
          body: reminder.message,
          url: "/app",
        });
        if (sent > 0) {
          await prisma.reminderRecipient.update({ where: { id: recipient.id }, data: { deliveredAt: new Date() } });
        }
      } catch (err) {
        console.error(`[reminder-scheduler] failed to notify employee ${recipient.employeeId}:`, err);
      }
    }
  }
}
