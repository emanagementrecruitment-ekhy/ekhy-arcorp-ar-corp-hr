import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { SETTING_ID } from "./settings";
import { notifyOffice } from "./notify";
import { sendPushToEmployee, pushConfigured } from "./push";
import { getAiUsageToday } from "./ai-usage";
import { DEMO_TERA_CODE, VCR_ROLE, LATE_CHECKIN_DEADLINE_HOUR, LATE_CHECKIN_GRACE_MINUTES, LATE_CHECKIN_PENALTY_AMOUNT } from "./constants";
import { fmtRp } from "./format";
import {
  ASSISTANT_TASKS,
  hhmm,
  jakartaClock,
  listNames,
  taskState,
  tasksDue,
  vcrFlags,
  type AssistantTask,
  type JakartaClock,
  type TaskState,
} from "./assistant-rules";

/**
 * Asisten Harian — rule-based automation run from the same 60 s tick as the reminder scheduler
 * (see src/instrumentation.ts). It reminds field staff to check in, reminds Tera to enter their VCR, and keeps the
 * office informed (who has not checked in, today's VCR total and anything unusual). Every task is claimed in the
 * AssistantRun table first (unique per day + task), so it can never fire twice. No external AI service is involved:
 * nothing about employees leaves the server.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export async function isAssistantEnabled(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({ where: { id: SETTING_ID }, select: { assistantEnabled: true } });
  return row?.assistantEnabled ?? true;
}

export async function setAssistantEnabled(enabled: boolean): Promise<void> {
  await prisma.appSetting.upsert({
    where: { id: SETTING_ID },
    update: { assistantEnabled: enabled },
    create: { id: SETTING_ID, assistantEnabled: enabled },
  });
}

interface Person {
  id: string;
  name: string;
  code: string;
  role: string;
  homePlace: string;
}

const PERSON_SELECT = { id: true, name: true, code: true, role: true, homePlace: true } as const;

/** Active field staff who are expected to check in (Tera and karyawan; the demo Tera is left out). */
async function rosterToday(): Promise<Person[]> {
  return prisma.employee.findMany({
    where: { accessRole: "KARYAWAN", status: "AKTIF", code: { not: DEMO_TERA_CODE } },
    select: PERSON_SELECT,
    orderBy: { name: "asc" },
  });
}

/** Anyone with a row for today counts as handled — a self check-in or a status code (off, izin, sakit…) typed by an admin. */
async function checkedInIds(dateKey: string): Promise<Set<string>> {
  const rows = await prisma.attendance.findMany({ where: { dateKey }, select: { employeeId: true } });
  return new Set(rows.map((r) => r.employeeId));
}

async function pushIds(): Promise<Set<string>> {
  const rows = await prisma.pushSubscription.findMany({ select: { employeeId: true }, distinct: ["employeeId"] });
  return new Set(rows.map((r) => r.employeeId));
}

async function uncheckedToday(dateKey: string): Promise<Person[]> {
  const [roster, done] = await Promise.all([rosterToday(), checkedInIds(dateKey)]);
  return roster.filter((p) => !done.has(p.id));
}

interface PushResult {
  delivered: number;
  noDevice: Person[];
}

async function pushToPeople(people: Person[], make: (p: Person) => { title: string; body: string; url?: string }): Promise<PushResult> {
  let delivered = 0;
  const noDevice: Person[] = [];
  for (const p of people) {
    try {
      const { sent } = await sendPushToEmployee(p.id, { url: "/app", ...make(p) });
      if (sent > 0) delivered++;
      else noDevice.push(p);
    } catch (e) {
      console.error(`[assistant] push failed for ${p.id}:`, e);
      noDevice.push(p);
    }
  }
  return { delivered, noDevice };
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

const DEADLINE_TEXT = `${String(LATE_CHECKIN_DEADLINE_HOUR).padStart(2, "0")}.00`;

// ---- Vouchers ----

interface VcrDay {
  count: number;
  amount: number;
  byEmployee: Map<string, { count: number; amount: number }>;
}

async function vouchersBetween(from: Date, to: Date): Promise<VcrDay> {
  const rows = await prisma.voucher.groupBy({
    by: ["employeeId"],
    where: { occurredAt: { gte: from, lt: to } },
    _count: { _all: true },
    _sum: { amount: true },
  });
  const byEmployee = new Map<string, { count: number; amount: number }>();
  let count = 0;
  let amount = 0;
  for (const r of rows) {
    const c = r._count._all;
    const a = r._sum.amount ?? 0;
    byEmployee.set(r.employeeId, { count: c, amount: a });
    count += c;
    amount += a;
  }
  return { count, amount, byEmployee };
}

async function teraRoster(): Promise<Person[]> {
  return prisma.employee.findMany({
    where: { accessRole: "KARYAWAN", status: "AKTIF", role: VCR_ROLE, code: { not: DEMO_TERA_CODE } },
    select: PERSON_SELECT,
    orderBy: { name: "asc" },
  });
}

interface VcrOverview {
  today: VcrDay;
  prev7: VcrDay;
  month: VcrDay;
  tera: { person: Person; today: number; amount: number; avg: number }[];
  flags: string[];
}

async function vcrOverview(clock: JakartaClock): Promise<VcrOverview> {
  const dayStart = clock.dayStartUtc;
  const [y, m] = clock.dateKey.split("-").map(Number);
  const monthStart = new Date(Date.UTC(y, m - 1, 1) - 7 * 60 * 60_000);
  const [today, prev7, month, tera] = await Promise.all([
    vouchersBetween(dayStart, new Date(dayStart.getTime() + DAY_MS)),
    vouchersBetween(new Date(dayStart.getTime() - 7 * DAY_MS), dayStart),
    vouchersBetween(monthStart, new Date(dayStart.getTime() + DAY_MS)),
    teraRoster(),
  ]);
  const rows = tera.map((p) => ({
    person: p,
    today: today.byEmployee.get(p.id)?.count ?? 0,
    amount: today.byEmployee.get(p.id)?.amount ?? 0,
    avg: (prev7.byEmployee.get(p.id)?.count ?? 0) / 7,
  }));
  const flags = vcrFlags({
    todayCount: today.count,
    avgCount: prev7.count / 7,
    perTera: rows.map((r) => ({ name: r.person.name, today: r.today, avg: r.avg })),
  });
  return { today, prev7, month, tera: rows, flags };
}

// ---- Tasks ----

interface TaskOutcome {
  targets: number;
  delivered: number;
  summary: string;
}

async function runCheckinReminder(task: AssistantTask, clock: JakartaClock): Promise<TaskOutcome> {
  const unchecked = await uncheckedToday(clock.dateKey);
  if (unchecked.length === 0) return { targets: 0, delivered: 0, summary: "Semua sudah absen — tidak ada yang perlu diingatkan." };
  const final = task.id === "checkin_2";
  const { delivered, noDevice } = await pushToPeople(unchecked, (p) => ({
    title: final ? "Segera absen" : "Jangan lupa absen",
    body: final
      ? p.role === VCR_ROLE
        ? `${firstName(p.name)}, kamu belum absen hari ini. Segera absen sekarang.`
        : `${firstName(p.name)}, batas absen jam ${DEADLINE_TEXT} (toleransi ${LATE_CHECKIN_GRACE_MINUTES} menit). Lewat itu kena pinalty ${fmtRp(LATE_CHECKIN_PENALTY_AMOUNT)}.`
      : `Selamat pagi ${firstName(p.name)}, jangan lupa absen hari ini.`,
  }));
  const extra = noDevice.length ? ` ${noDevice.length} orang belum mengaktifkan notifikasi (${listNames(noDevice.map((p) => p.name), 4)}).` : "";
  return { targets: unchecked.length, delivered, summary: `${delivered} dari ${unchecked.length} yang belum absen sudah diingatkan.${extra}` };
}

async function runCheckinReport(clock: JakartaClock): Promise<TaskOutcome> {
  const [roster, unchecked, withPush] = await Promise.all([rosterToday(), uncheckedToday(clock.dateKey), pushIds()]);
  if (roster.length === 0) return { targets: 0, delivered: 0, summary: "Belum ada Tera/karyawan terdaftar." };
  if (unchecked.length === 0) {
    await notifyOffice(`✅ Asisten: semua ${roster.length} Tera/karyawan sudah absen hari ini.`);
    return { targets: 0, delivered: 0, summary: `Semua ${roster.length} orang sudah absen. Kantor diberi tahu.` };
  }
  const noPush = unchecked.filter((p) => !withPush.has(p.id));
  await notifyOffice(
    `⚠️ Asisten: ${unchecked.length} dari ${roster.length} belum absen sampai jam ${hhmm(clock.minutes)} — ${listNames(unchecked.map((p) => p.name))}.` +
      (noPush.length ? ` ${noPush.length} di antaranya belum mengaktifkan notifikasi, hubungi langsung.` : ""),
  );
  return { targets: unchecked.length, delivered: 0, summary: `${unchecked.length} dari ${roster.length} belum absen, kantor diberi tahu.` };
}

async function runVcrReminder(clock: JakartaClock): Promise<TaskOutcome> {
  const [tera, checked, vcr] = await Promise.all([
    teraRoster(),
    checkedInIds(clock.dateKey),
    vouchersBetween(clock.dayStartUtc, new Date(clock.dayStartUtc.getTime() + DAY_MS)),
  ]);
  // Only people who came in today: someone on their day off or on leave is not chased for VCR.
  const targets = tera.filter((p) => checked.has(p.id) && !vcr.byEmployee.has(p.id));
  if (targets.length === 0) return { targets: 0, delivered: 0, summary: "Semua Tera yang masuk hari ini sudah punya VCR tercatat." };
  const { delivered, noDevice } = await pushToPeople(targets, (p) => ({
    title: "Input VCR hari ini",
    body: `${firstName(p.name)}, belum ada VCR tercatat hari ini. Jangan lupa input pendapatan sebelum tutup hari.`,
  }));
  const extra = noDevice.length ? ` ${noDevice.length} orang belum mengaktifkan notifikasi.` : "";
  return { targets: targets.length, delivered, summary: `${delivered} dari ${targets.length} Tera tanpa VCR hari ini sudah diingatkan.${extra}` };
}

async function runVcrReport(clock: JakartaClock): Promise<TaskOutcome> {
  const o = await vcrOverview(clock);
  const avg = Math.round(o.prev7.count / 7);
  const zero = o.tera.filter((r) => r.today === 0);
  let text = `📊 Asisten: VCR hari ini ${o.today.count} voucher (${fmtRp(o.today.amount)}), rata-rata 7 hari terakhir ${avg}/hari.`;
  if (zero.length) text += ` ${zero.length} Tera belum ada VCR: ${listNames(zero.map((r) => r.person.name), 6)}.`;
  if (o.flags.length) text += ` Perlu dicek: ${o.flags.join(" ")}`;
  await notifyOffice(text);
  return {
    targets: o.flags.length,
    delivered: 0,
    summary: `${o.today.count} voucher, ${fmtRp(o.today.amount)}; ${zero.length} Tera tanpa VCR; ${o.flags.length} temuan.`,
  };
}

async function execute(task: AssistantTask, clock: JakartaClock): Promise<TaskOutcome> {
  switch (task.id) {
    case "checkin_1":
    case "checkin_2":
      return runCheckinReminder(task, clock);
    case "checkin_report":
      return runCheckinReport(clock);
    case "vcr_reminder":
      return runVcrReminder(clock);
    case "vcr_report":
      return runVcrReport(clock);
  }
}

/** Runs every scheduled task that is due and has not run today. Safe to call every minute. */
export async function runDueTasks(now: Date = new Date()): Promise<void> {
  const clock = jakartaClock(now);
  const early = tasksDue(clock.minutes, new Set());
  if (early.length === 0) return; // nothing is in its window right now — skip the DB entirely
  if (!(await isAssistantEnabled())) return;

  const ran = await prisma.assistantRun.findMany({ where: { dateKey: clock.dateKey }, select: { task: true } });
  const due = tasksDue(clock.minutes, new Set(ran.map((r) => r.task)));

  for (const task of due) {
    let runId: string;
    try {
      const row = await prisma.assistantRun.create({ data: { dateKey: clock.dateKey, task: task.id, summary: "Sedang berjalan…" } });
      runId = row.id;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue; // another tick already claimed it
      throw e;
    }
    try {
      const out = await execute(task, clock);
      await prisma.assistantRun.update({ where: { id: runId }, data: out });
    } catch (e) {
      console.error(`[assistant] task ${task.id} failed:`, e);
      await prisma.assistantRun.update({ where: { id: runId }, data: { summary: `Gagal: ${e instanceof Error ? e.message : "kesalahan tidak diketahui"}` } });
    }
  }
}

/** "Ingatkan sekarang" button: pushes to everyone who has not checked in yet, whatever the schedule says. */
export async function remindUncheckedNow(now: Date = new Date()): Promise<TaskOutcome> {
  const clock = jakartaClock(now);
  const unchecked = await uncheckedToday(clock.dateKey);
  let out: TaskOutcome;
  if (unchecked.length === 0) {
    out = { targets: 0, delivered: 0, summary: "Semua sudah absen — tidak ada yang diingatkan." };
  } else {
    const { delivered, noDevice } = await pushToPeople(unchecked, (p) => ({
      title: "Jangan lupa absen",
      body: `${firstName(p.name)}, kamu belum absen hari ini. Segera absen ya.`,
    }));
    const extra = noDevice.length ? ` ${noDevice.length} orang belum mengaktifkan notifikasi.` : "";
    out = { targets: unchecked.length, delivered, summary: `Diingatkan manual: ${delivered} dari ${unchecked.length} orang.${extra}` };
  }
  await prisma.assistantRun.create({
    data: { dateKey: clock.dateKey, task: `manual-${now.getTime()}`, manual: true, ...out },
  });
  return out;
}

// ---- Dashboard ----

export interface AssistantSnapshot {
  now: { dateKey: string; time: string };
  enabled: boolean;
  pushReady: boolean;
  ai: { configured: boolean; used: number; limit: number };
  coverage: { total: number; withPush: number };
  attendance: {
    expected: number;
    checked: number;
    unchecked: { id: string; name: string; code: string; role: string; place: string; hasPush: boolean }[];
  };
  vcr: {
    todayCount: number;
    todayAmount: number;
    avgCount: number;
    monthCount: number;
    monthAmount: number;
    flags: string[];
    tera: { id: string; name: string; today: number; amount: number; avg: number; checkedIn: boolean }[];
  };
  schedule: { id: string; label: string; time: string; audience: string; state: TaskState; summary: string | null }[];
  recent: { id: string; dateKey: string; time: string; label: string; targets: number; delivered: number; summary: string; manual: boolean }[];
}

const TASK_LABEL = new Map<string, string>(ASSISTANT_TASKS.map((t) => [t.id, t.label]));

export async function getAssistantSnapshot(now: Date = new Date()): Promise<AssistantSnapshot> {
  const clock = jakartaClock(now);
  const [enabled, roster, checked, withPush, vcr, runsToday, recent, aiUsage] = await Promise.all([
    isAssistantEnabled(),
    rosterToday(),
    checkedInIds(clock.dateKey),
    pushIds(),
    vcrOverview(clock),
    prisma.assistantRun.findMany({ where: { dateKey: clock.dateKey } }),
    prisma.assistantRun.findMany({ orderBy: { ranAt: "desc" }, take: 25 }),
    getAiUsageToday(now),
  ]);

  const unchecked = roster.filter((p) => !checked.has(p.id));
  const runByTask = new Map(runsToday.map((r) => [r.task, r]));

  return {
    now: { dateKey: clock.dateKey, time: hhmm(clock.minutes) },
    enabled,
    pushReady: pushConfigured(),
    ai: { configured: !!process.env.ANTHROPIC_API_KEY?.trim(), ...aiUsage },
    coverage: { total: roster.length, withPush: roster.filter((p) => withPush.has(p.id)).length },
    attendance: {
      expected: roster.length,
      checked: roster.length - unchecked.length,
      unchecked: unchecked.map((p) => ({ id: p.id, name: p.name, code: p.code, role: p.role, place: p.homePlace, hasPush: withPush.has(p.id) })),
    },
    vcr: {
      todayCount: vcr.today.count,
      todayAmount: vcr.today.amount,
      avgCount: Math.round((vcr.prev7.count / 7) * 10) / 10,
      monthCount: vcr.month.count,
      monthAmount: vcr.month.amount,
      flags: vcr.flags,
      tera: vcr.tera
        .map((r) => ({ id: r.person.id, name: r.person.name, today: r.today, amount: r.amount, avg: Math.round(r.avg * 10) / 10, checkedIn: checked.has(r.person.id) }))
        .sort((a, b) => a.today - b.today || a.name.localeCompare(b.name)),
    },
    schedule: ASSISTANT_TASKS.map((t) => {
      const run = runByTask.get(t.id);
      return {
        id: t.id,
        label: t.label,
        time: hhmm(t.at),
        audience: t.audience,
        state: taskState(t, clock.minutes, !!run),
        summary: run?.summary ?? null,
      };
    }),
    recent: recent.map((r) => ({
      id: r.id,
      dateKey: r.dateKey,
      time: hhmm(jakartaClock(r.ranAt).minutes),
      label: r.manual ? "Pengingat manual" : (TASK_LABEL.get(r.task) ?? r.task),
      targets: r.targets,
      delivered: r.delivered,
      summary: r.summary,
      manual: r.manual,
    })),
  };
}
