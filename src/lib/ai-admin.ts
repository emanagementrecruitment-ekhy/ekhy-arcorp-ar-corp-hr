import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";
import { buildPayslip, ensureRecurringCosts } from "./payslip";
import { getAssistantSnapshot } from "./assistant";
import { aiProvider, askGateway, gatewayConfig } from "./ai-gateway";
import { buildOperationalReport } from "./report-data";
import { tryConsumeAi } from "./ai-usage";
import { limitNotice } from "./ai-limits";
import { anthropicHeadersFromEnv } from "./ai-client-config";
import { jakartaClock, hhmm } from "./assistant-rules";
import { monthLabel } from "./format";
import { ATTENDANCE_MIN_DAYS, DEMO_CODES, STAFF_ROLES, VOUCHER_LABEL, usesVcr, type EmployeeLevel } from "./constants";
import { asksForExplanation, wordCount, type AssistantLink, type ChatTurn } from "./ai-assistant-rules";
import {
  ADMIN_TOOLS,
  adminAggregateFacts,
  adminHelpAnswer,
  aiAdmitsNoAnswer,
  adminLinks,
  adminSystemPrompt,
  adminSystemPromptAggregate,
  adminUnknownAnswer,
  candidatesAnswer,
  detailAnswer,
  detectReportPeriod,
  extractLookupName,
  kasbonTotalAnswer,
  matchAdminIntent,
  overviewAnswer,
  payrollAnswer,
  pendingKasbonAnswer,
  uncheckedAnswer,
  vcrTotalAnswer,
  type AdminIntent,
  type EmployeeBrief,
  type EmployeeDetail,
  type KasbonSummary,
  type Overview,
  type PayrollSummary,
  type PendingKasbon,
} from "./ai-admin-rules";

/**
 * Ara's admin mode. Read-only lookups over operational data (attendance, VCR, kasbon, Slip Pay totals) for the
 * office roles. By design nothing here selects NIK, phone, email, address or birth date, so even the questions that
 * are handed to Claude cannot carry them. Simple questions are answered by rules without any AI call.
 */

const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_OUTPUT_TOKENS = 2000;
const MAX_TOOL_ROUNDS = 5;
const MAX_SLIP_ROWS = 14;

// Employees as the office sees them in Data Karyawan: staff tiers only (not Owner/Consultant), minus the demo Tera.
const visibleWhere = { accessRole: { in: [...STAFF_ROLES] }, NOT: { code: { in: DEMO_CODES } } };

function ymd(d: Date): string {
  return jakartaClock(d).dateKey;
}

export async function searchEmployees(query: string): Promise<EmployeeBrief[]> {
  const q = query.trim();
  if (!q) return [];
  // Match every word of the query against name or code, so "budi staff" and "AR-07" both work.
  const words = q.split(/\s+/).slice(0, 4);
  const rows = await prisma.employee.findMany({
    where: { ...visibleWhere, AND: words.map((w) => ({ OR: [{ name: { contains: w } }, { code: { contains: w } }] })) },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    take: 8,
    select: { code: true, name: true, role: true, status: true },
  });
  return rows;
}

export async function getEmployeeDetail(code: string, now = new Date()): Promise<EmployeeDetail | null> {
  const emp = await prisma.employee.findFirst({
    where: { ...visibleWhere, code: code.trim() },
    include: { supervisor: { select: { name: true } } },
  });
  if (!emp) return null;
  const clock = jakartaClock(now);
  const month = clock.dateKey.slice(0, 7);
  const isTera = usesVcr(emp.role);
  const monthStart = new Date(`${month}-01T00:00:00+07:00`);

  await ensureRecurringCosts(emp.id, month).catch(() => {});
  const [today, hariHadir, payslip, kasbon, pending, vToday, vMonth] = await Promise.all([
    prisma.attendance.findUnique({ where: { employeeId_dateKey: { employeeId: emp.id, dateKey: clock.dateKey } } }),
    prisma.attendance.count({ where: { employeeId: emp.id, month } }),
    buildPayslip(emp.id, month).catch(() => null),
    prisma.kasbon.findMany({ where: { employeeId: emp.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.kasbon.count({ where: { employeeId: emp.id, status: "MENUNGGU_OWNER" } }),
    isTera ? prisma.voucher.aggregate({ where: { employeeId: emp.id, occurredAt: { gte: clock.dayStartUtc } }, _count: true, _sum: { amount: true } }) : null,
    isTera ? prisma.voucher.aggregate({ where: { employeeId: emp.id, occurredAt: { gte: monthStart } }, _count: true, _sum: { amount: true } }) : null,
  ]);

  return {
    code: emp.code,
    name: emp.name,
    role: emp.role,
    status: emp.status,
    accessRole: emp.accessRole,
    isTera,
    levelLabel: emp.level ? (VOUCHER_LABEL[emp.level as EmployeeLevel] ?? emp.level) : null,
    supervisor: emp.supervisor?.name ?? null,
    joined: ymd(emp.createdAt),
    attendance: {
      monthLabel: monthLabel(month),
      hariHadir,
      minDays: ATTENDANCE_MIN_DAYS,
      todayCheckedIn: !!today,
      todayAt: today ? hhmm(jakartaClock(today.createdAt).minutes) : null,
    },
    vcr:
      vToday && vMonth
        ? { todayCount: vToday._count, todayAmount: vToday._sum.amount ?? 0, monthCount: vMonth._count, monthAmount: vMonth._sum.amount ?? 0 }
        : null,
    slip: {
      total: payslip ? payslip.total : null,
      // Descriptions only: the free-text note column is left out on purpose (it may hold anything an admin typed).
      rows: (payslip?.rows ?? []).slice(0, MAX_SLIP_ROWS).map((r) => ({ description: r.description, debit: r.debit, credit: r.credit })),
    },
    kasbon: {
      pending,
      recent: kasbon.map((k) => ({ date: ymd(k.createdAt), amount: k.amount, status: k.status, transferred: !!k.transferredAt })),
    },
  };
}

export async function getOverview(now = new Date()): Promise<Overview> {
  const [snap, pending] = await Promise.all([getAssistantSnapshot(now), prisma.kasbon.count({ where: { status: "MENUNGGU_OWNER" } })]);
  return {
    now: snap.now.time,
    monthLabel: monthLabel(snap.now.dateKey.slice(0, 7)),
    roster: snap.attendance.expected,
    checkedIn: snap.attendance.checked,
    unchecked: snap.attendance.unchecked.map((p) => ({ name: p.name, code: p.code, role: p.role })),
    vcr: {
      todayCount: snap.vcr.todayCount,
      todayAmount: snap.vcr.todayAmount,
      monthCount: snap.vcr.monthCount,
      monthAmount: snap.vcr.monthAmount,
      avgCount: snap.vcr.avgCount,
    },
    kasbonPending: pending,
  };
}

export async function listPendingKasbon(): Promise<PendingKasbon[]> {
  const rows = await prisma.kasbon.findMany({
    where: { status: "MENUNGGU_OWNER" },
    orderBy: { createdAt: "asc" },
    take: 25,
    include: { employee: { select: { name: true, code: true } } },
  });
  // The employee's free-text reason is not selected: it is typed by the employee and must never steer the AI.
  return rows.map((k) => ({ name: k.employee.name, code: k.employee.code, amount: k.amount, date: ymd(k.createdAt) }));
}

/** The same payout totals as the Laporan Totalan page (it uses these very numbers), for one report period. */
export async function getPayrollSummary(period: PayrollSummary["period"], now = new Date()): Promise<PayrollSummary> {
  const report = await buildOperationalReport(period, now);
  const t = report.totals;
  return {
    period,
    periodLabel: report.periodLabel,
    payroll: t.payroll,
    teraGross: t.teraGross,
    teraVoucherCount: t.teraVoucherCount,
    staffPay: t.staffPay,
    teraKasbon: t.teraKasbon,
    staffKasbon: t.staffKasbon,
    teraNet: t.teraNet,
    staffNet: t.staffNet,
  };
}

/** Counts and amounts only (no names): everything waiting for the Owner, plus this month's decisions. */
export async function getKasbonSummary(now = new Date()): Promise<KasbonSummary> {
  const clock = jakartaClock(now);
  const month = clock.dateKey.slice(0, 7);
  const monthStart = new Date(`${month}-01T00:00:00+07:00`);
  const [pending, decided] = await Promise.all([
    prisma.kasbon.aggregate({ where: { status: "MENUNGGU_OWNER" }, _count: true, _sum: { amount: true } }),
    prisma.kasbon.findMany({
      where: { createdAt: { gte: monthStart }, status: { in: ["DISETUJUI", "DITOLAK"] } },
      select: { status: true, amount: true, transferredAt: true },
    }),
  ]);
  const approved = decided.filter((k) => k.status === "DISETUJUI");
  const transferred = approved.filter((k) => k.transferredAt);
  const total = (rows: { amount: number }[]) => rows.reduce((s, k) => s + k.amount, 0);
  return {
    monthLabel: monthLabel(month),
    pending: { count: pending._count, amount: pending._sum.amount ?? 0 },
    approved: { count: approved.length, amount: total(approved), transferredCount: transferred.length, transferredAmount: total(transferred) },
    rejected: { count: decided.length - approved.length },
  };
}

export interface AdminReply {
  text: string;
  source: "rules" | "ai";
  links: AssistantLink[];
  /** Angel could not answer: offer the "send to Owner/Admin" button. */
  canForward?: boolean;
}

async function lookupAnswer(message: string): Promise<string> {
  const query = extractLookupName(message);
  const found = await searchEmployees(query);
  // An exact code, or a single match, goes straight to the detail.
  const exact = found.find((p) => p.code.toLowerCase() === query.toLowerCase());
  const pick = exact ?? (found.length === 1 ? found[0] : null);
  if (pick) {
    const detail = await getEmployeeDetail(pick.code);
    if (detail) return detailAnswer(detail);
  }
  return candidatesAnswer(query, found);
}

async function ruleAnswerAdmin(intent: AdminIntent, message: string, adminName: string): Promise<string> {
  switch (intent) {
    case "greeting":
      return `Halo ${adminName.split(/\s+/)[0]}! Saya Angel. Mau lihat ringkasan hari ini, yang belum absen, kasbon menunggu, atau rincian karyawan?`;
    case "thanks":
      return "Sama-sama! Kalau perlu data lain, tanya saja.";
    case "help":
      return adminHelpAnswer();
    case "overview":
      return overviewAnswer(await getOverview());
    case "unchecked":
      return uncheckedAnswer(await getOverview());
    case "kasbon_pending":
      return pendingKasbonAnswer(await listPendingKasbon());
    case "payroll":
      return payrollAnswer(await getPayrollSummary(detectReportPeriod(message)));
    case "vcr_total":
      return vcrTotalAnswer(await getOverview());
    case "kasbon_total":
      return kasbonTotalAnswer(await getKasbonSummary());
    case "lookup":
      return lookupAnswer(message);
  }
}

/**
 * Free-form office questions through the central gateway. Only anonymous aggregates leave the server (totals and
 * counts, no names or per-person rows), and no chat history is sent: earlier rule answers may name people.
 */
async function askGatewayAdmin(message: string): Promise<string> {
  const cfg = gatewayConfig();
  if (!cfg) throw new Error("AI gateway is not configured");
  const now = new Date();
  const clock = jakartaClock(now);
  const [overview, harian, mingguan, bulanan, kasbon] = await Promise.all([
    getOverview(now),
    getPayrollSummary("harian", now),
    getPayrollSummary("mingguan", now),
    getPayrollSummary("bulanan", now),
    getKasbonSummary(now),
  ]);
  const system = adminSystemPromptAggregate(hhmm(clock.minutes), clock.dateKey, adminAggregateFacts(overview, [harian, mingguan, bulanan], kasbon));
  return askGateway(cfg, system, [{ role: "user", content: message }]);
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic({ timeout: 60_000, maxRetries: 1, defaultHeaders: anthropicHeadersFromEnv(process.env) });
  return client;
}

async function runTool(name: string, input: unknown): Promise<string> {
  const args = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  switch (name) {
    case "search_employees":
      return JSON.stringify(await searchEmployees(String(args.query ?? "")));
    case "get_employee_detail": {
      const d = await getEmployeeDetail(String(args.code ?? ""));
      return JSON.stringify(d ?? { error: "Karyawan tidak ditemukan." });
    }
    case "get_today_overview":
      return JSON.stringify(await getOverview());
    case "list_pending_kasbon":
      return JSON.stringify(await listPendingKasbon());
    default:
      return JSON.stringify({ error: "Alat tidak dikenal." });
  }
}

async function askClaudeAdmin(adminName: string, history: ChatTurn[], message: string): Promise<string> {
  const clock = jakartaClock(new Date());
  const system = adminSystemPrompt(adminName, hhmm(clock.minutes), clock.dateKey);
  const messages: Anthropic.Beta.BetaMessageParam[] = [...history, { role: "user", content: message }];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic().beta.messages.create({
      model: process.env.ASSISTANT_AI_MODEL?.trim() || DEFAULT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      messages,
      tools: ADMIN_TOOLS,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    if (response.stop_reason === "refusal") return "Maaf, saya tidak bisa menjawab itu. Coba tanya soal absen, VCR, kasbon, atau rincian karyawan.";

    if (response.stop_reason === "tool_use") {
      // Keep the whole assistant turn (thinking blocks included), then answer every tool call in ONE user message.
      messages.push({ role: "assistant", content: response.content });
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        try {
          results.push({ type: "tool_result", tool_use_id: block.id, content: await runTool(block.name, block.input) });
        } catch (e) {
          console.error("[ai-admin] tool failed:", block.name, e instanceof Error ? e.message : e);
          results.push({ type: "tool_result", tool_use_id: block.id, content: "Data tidak bisa diambil saat ini.", is_error: true });
        }
      }
      messages.push({ role: "user", content: results });
      continue;
    }

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!text) throw new Error("Empty AI reply");
    return text;
  }
  return "Pertanyaannya terlalu luas untuk saya jawab sekaligus. Coba persempit, mis. satu karyawan atau satu hal.";
}

/**
 * One admin turn: rules for the common questions (including company-wide totals), then the AI for the rest: the
 * central gateway (aggregates only) or Claude (with read-only lookups). Whatever cannot be answered is offered to
 * Owner/Admin through the forward button instead of a technical error.
 */
export async function answerAdmin(adminId: string, adminName: string, message: string, history: ChatTurn[]): Promise<AdminReply> {
  const intent = matchAdminIntent(message);
  const provider = aiProvider();
  const useAi = provider !== null;
  // With the gateway a name lookup stays on the server: names and per-person pay must not go to an outside AI.
  const keepOnServer = provider === "gateway" && intent === "lookup";

  // "Why / compare / explain" questions need the AI: the rule answer only prints the numbers (it stays the fallback).
  const wantsExplanation = intent !== null && asksForExplanation(message);

  if (intent && (!useAi || keepOnServer || (wordCount(message) <= 10 && !wantsExplanation))) {
    const text = await ruleAnswerAdmin(intent, message, adminName);
    return { text, source: "rules", links: adminLinks(message) };
  }
  if (!useAi) return { text: adminUnknownAnswer(), source: "rules", links: [], canForward: true };

  // The AI has a daily allowance (per person and app-wide): spend one slot or stay rule-based.
  const gate = await tryConsumeAi(adminId, true);
  if (!gate.ok) {
    const base = intent ? await ruleAnswerAdmin(intent, message, adminName) : adminUnknownAnswer();
    return { text: `${base}\n\n${limitNotice(gate.reason)}`, source: "rules", links: adminLinks(message), canForward: !intent };
  }

  try {
    const text = provider === "gateway" ? await askGatewayAdmin(message) : await askClaudeAdmin(adminName, history, message);
    return { text, source: "ai", links: adminLinks(message, text), canForward: aiAdmitsNoAnswer(text) };
  } catch (e) {
    console.error("[ai-admin] AI call failed:", e instanceof Error ? e.message : e);
    // Never a dead end: fall back to the rules, or to the polite "cannot answer" with the forward button.
    const text = intent ? await ruleAnswerAdmin(intent, message, adminName) : adminUnknownAnswer();
    return { text, source: "rules", links: adminLinks(message), canForward: !intent };
  }
}
