// Next.js instrumentation hook — register() runs once when the server
// process starts (see https://nextjs.org/docs/app/guides/instrumentation).
// Used here to start the reminder-push interval alongside the normal
// `next start` process on Railway (see src/lib/reminder-scheduler.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Next's dev server can call register() more than once across Fast
  // Refresh reloads — a module-scoped flag alone gets reset on each reload,
  // so a global is used to survive that and avoid stacking up intervals.
  const globalScope = globalThis as unknown as { __arcorpReminderSchedulerStarted?: boolean };
  if (globalScope.__arcorpReminderSchedulerStarted) return;
  globalScope.__arcorpReminderSchedulerStarted = true;

  const { processDueReminders } = await import("./lib/reminder-scheduler");
  const CHECK_INTERVAL_MS = 60_000;
  setInterval(() => {
    processDueReminders().catch((err) => console.error("[instrumentation] reminder check failed:", err));
  }, CHECK_INTERVAL_MS);
}
