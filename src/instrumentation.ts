// Next.js instrumentation hook — register() runs once when the server
// process starts (see https://nextjs.org/docs/app/guides/instrumentation).
// Used here to start the reminder-push interval alongside the normal
// `next start` process on Railway (see src/lib/reminder-scheduler.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Railway's outbound networking for this service has IPv6 egress
  // disabled, but Node's default `dns.lookup()` still returns the AAAA
  // (IPv6) record first for hosts that publish one (e.g. smtp.gmail.com) —
  // every outbound connection to such a host then fails outright
  // (ENETUNREACH/ETIMEDOUT) before the app-level code (nodemailer, fetch,
  // …) even gets a chance to talk to it. This is a process-wide setting
  // (Node 17+) rather than a per-connection option because nothing here
  // (nodemailer in particular) exposes a "use IPv4" option of its own.
  const { setDefaultResultOrder } = await import("node:dns");
  setDefaultResultOrder("ipv4first");

  // Next's dev server can call register() more than once across Fast
  // Refresh reloads — a module-scoped flag alone gets reset on each reload,
  // so a global is used to survive that and avoid stacking up intervals.
  const globalScope = globalThis as unknown as { __arcorpReminderSchedulerStarted?: boolean };
  if (globalScope.__arcorpReminderSchedulerStarted) return;
  globalScope.__arcorpReminderSchedulerStarted = true;

  const { processDueReminders } = await import("./lib/reminder-scheduler");
  const { checkBirthdaysToday } = await import("./lib/birthday-scheduler");
  const CHECK_INTERVAL_MS = 60_000;
  setInterval(() => {
    processDueReminders().catch((err) => console.error("[instrumentation] reminder check failed:", err));
    checkBirthdaysToday().catch((err) => console.error("[instrumentation] birthday check failed:", err));
  }, CHECK_INTERVAL_MS);
}
