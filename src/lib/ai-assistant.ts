import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";
import { buildPayslip, ensureRecurringCosts } from "./payslip";
import { monthLabel } from "./format";
import { getActiveAnnouncementText } from "./settings";
import { tryConsumeAi } from "./ai-usage";
import { limitNotice } from "./ai-limits";
import { anthropicHeadersFromEnv } from "./ai-client-config";
import { aiProvider, askGateway, gatewayConfig, restoreName, scrubIdentity } from "./ai-gateway";
import { jakartaClock, hhmm } from "./assistant-rules";
import {
  ATTENDANCE_MIN_DAYS,
  LATE_CHECKIN_DEADLINE_HOUR,
  LATE_CHECKIN_GRACE_MINUTES,
  LATE_CHECKIN_PENALTY_AMOUNT,
  usesVcr,
} from "./constants";
import {
  buildSystemPrompt,
  asksForExplanation,
  matchIntent,
  ruleAnswer,
  suggestLinks,
  unknownAnswer,
  wordCount,
  type AssistantLink,
  type ChatTurn,
  type EmployeeFacts,
  type Intent,
} from "./ai-assistant-rules";

/**
 * "Ara", the employee chat assistant. Hybrid by design: common questions (absen, VCR, Slip Pay, kasbon, pinalty)
 * are answered by the rules in ai-assistant-rules.ts straight from the employee's own data — free, instant, and
 * nothing leaves the server. Anything else goes to Claude, with that one employee's facts in the system prompt.
 * Without ANTHROPIC_API_KEY the assistant simply stays rule-based.
 */

// Opus is the Claude API default; set ASSISTANT_AI_MODEL (e.g. claude-haiku-5-5) for a cheaper model.
const DEFAULT_MODEL = "claude-opus-5-5";
const MAX_OUTPUT_TOKENS = 1200;

/** Claude (Anthropic) is configured. The office assistant (ai-admin.ts) depends on this one only. */
export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

/** Free-form employee questions can be answered by an AI: the central gateway (AI_PROVIDER=gateway) or Claude. */
export function employeeAiConfigured(): boolean {
  return aiProvider() !== null;
}

function toYm(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** Everything the assistant may say about this one employee — never anyone else's data. */
export async function buildEmployeeFacts(employeeId: string, now = new Date()): Promise<EmployeeFacts> {
  const clock = jakartaClock(now);
  const month = toYm(clock.dateKey);
  const employee = await prisma.employee.findUniqueOrThrow({ where: { id: employeeId } });
  const isTera = usesVcr(employee.role);

  await ensureRecurringCosts(employeeId, month).catch(() => {});
  const monthStart = new Date(`${month}-01T00:00:00+07:00`);
  const [attendanceToday, hariHadir, payslip, kasbonLatest, kasbonPending, announcement, vouchersToday, vouchersMonth] =
    await Promise.all([
      prisma.attendance.findUnique({ where: { employeeId_dateKey: { employeeId, dateKey: clock.dateKey } } }),
      prisma.attendance.count({ where: { employeeId, month } }),
      buildPayslip(employeeId, month).catch(() => null),
      prisma.kasbon.findFirst({ where: { employeeId }, orderBy: { createdAt: "desc" } }),
      prisma.kasbon.count({ where: { employeeId, status: "MENUNGGU_OWNER" } }),
      getActiveAnnouncementText().catch(() => null),
      isTera
        ? prisma.voucher.aggregate({
            where: { employeeId, occurredAt: { gte: clock.dayStartUtc } },
            _count: true,
            _sum: { amount: true },
          })
        : null,
      isTera
        ? prisma.voucher.aggregate({
            where: { employeeId, occurredAt: { gte: monthStart } },
            _count: true,
            _sum: { amount: true },
          })
        : null,
    ]);

  return {
    name: employee.name,
    firstName: employee.name.trim().split(/\s+/)[0] ?? employee.name,
    code: employee.code,
    role: employee.role,
    isTera,
    latePenaltyApplies: employee.accessRole === "KARYAWAN" && !isTera,
    now: { dateKey: clock.dateKey, minutes: clock.minutes, label: hhmm(clock.minutes) },
    today: {
      checkedIn: !!attendanceToday,
      checkedInAt: attendanceToday ? hhmm(jakartaClock(attendanceToday.createdAt).minutes) : null,
    },
    month: { label: monthLabel(month), hariHadir, minDays: ATTENDANCE_MIN_DAYS },
    deadline: {
      text: `${LATE_CHECKIN_DEADLINE_HOUR}.00`,
      graceText: hhmm(LATE_CHECKIN_DEADLINE_HOUR * 60 + LATE_CHECKIN_GRACE_MINUTES),
      penalty: LATE_CHECKIN_PENALTY_AMOUNT,
    },
    vcr:
      vouchersToday && vouchersMonth
        ? {
            todayCount: vouchersToday._count,
            todayAmount: vouchersToday._sum.amount ?? 0,
            monthCount: vouchersMonth._count,
            monthAmount: vouchersMonth._sum.amount ?? 0,
          }
        : null,
    slipTotal: payslip ? payslip.total : null,
    kasbon: {
      pending: kasbonPending,
      latest: kasbonLatest
        ? { amount: kasbonLatest.amount, status: kasbonLatest.status, date: jakartaClock(kasbonLatest.createdAt).dateKey }
        : null,
    },
    announcement,
  };
}

export interface AssistantReply {
  text: string;
  source: "rules" | "ai";
  intent: Intent | null;
  links: AssistantLink[];
  canForward: boolean;
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic({ timeout: 45_000, maxRetries: 1, defaultHeaders: anthropicHeadersFromEnv(process.env) });
  return client;
}

function textOf(blocks: Anthropic.Beta.BetaContentBlock[]): string {
  return blocks
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

async function askClaude(facts: EmployeeFacts, history: ChatTurn[], message: string): Promise<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [...history, { role: "user", content: message }];
  const response = await anthropic().beta.messages.create({
    model: process.env.ASSISTANT_AI_MODEL?.trim() || DEFAULT_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: buildSystemPrompt(facts),
    messages,
    // Short chat replies: keep reasoning light so answers are quick and cheap.
    output_config: { effort: "low" },
    // If a safety classifier declines, the API retries on a fallback model by itself.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (response.stop_reason === "refusal") {
    return `Maaf ${facts.firstName}, saya tidak bisa menjawab itu. Coba tanya soal absen, VCR, Slip Pay, atau kasbon ya.`;
  }
  const text = textOf(response.content);
  if (!text) throw new Error("Empty AI reply");
  return text;
}

/**
 * Central gateway path. Data minimisation: the employee's name and code never leave the server — they are
 * scrubbed from the prompt, the history and the question, and the first name is put back into the reply here.
 */
async function askViaGateway(facts: EmployeeFacts, history: ChatTurn[], message: string): Promise<string> {
  const cfg = gatewayConfig();
  if (!cfg) throw new Error("AI gateway is not configured");
  const scrub = (t: string) => scrubIdentity(t, facts);
  const text = await askGateway(
    cfg,
    buildSystemPrompt(facts, { anonymous: true }),
    [...history, { role: "user" as const, content: message }].map((m) => ({ role: m.role, content: scrub(m.content) })),
  );
  return restoreName(text, facts.firstName);
}

/** One assistant turn: rules first, the AI for everything the rules cannot understand. */
export async function answerEmployee(employeeId: string, message: string, history: ChatTurn[]): Promise<AssistantReply> {
  const facts = await buildEmployeeFacts(employeeId);
  const intent = matchIntent(message);
  const useAi = employeeAiConfigured();
  const requestLike = intent === "request";

  // A short, clear question is answered by the rules (free, instant). A long or unclear one deserves real
  // understanding — that's where Claude is worth its cost.
  // The exception: a request to explain or compare ("jelaskan VCR itu apa") needs the AI, because the rule answer
  // only prints numbers. If the AI is unavailable the rule answer is still used (see the fallbacks below).
  const wantsExplanation = intent !== null && !requestLike && asksForExplanation(message);
  if (intent && (!useAi || requestLike || (wordCount(message) <= 10 && !wantsExplanation))) {
    const text = ruleAnswer(intent, facts);
    return { text, source: "rules", intent, links: suggestLinks(message), canForward: requestLike || intent === "contact" };
  }

  if (!useAi) {
    return { text: unknownAnswer(facts), source: "rules", intent: null, links: [], canForward: true };
  }

  // Claude costs money: spend one slot of today's allowance (per person and app-wide) or stay rule-based.
  const gate = await tryConsumeAi(employeeId, false);
  if (!gate.ok) {
    const base = intent ? ruleAnswer(intent, facts) : unknownAnswer(facts);
    return { text: `${base}\n\n${limitNotice(gate.reason)}`, source: "rules", intent, links: suggestLinks(message), canForward: true };
  }

  try {
    const text = aiProvider() === "gateway" ? await askViaGateway(facts, history, message) : await askClaude(facts, history, message);
    const wantsOffice = /kirim ke kantor/i.test(text);
    return { text, source: "ai", intent, links: suggestLinks(message, text), canForward: wantsOffice };
  } catch (e) {
    console.error("[ai-assistant] AI call failed:", e instanceof Error ? e.message : e);
    // Never leave the employee with a dead end: fall back to the rules, or to the polite "didn't understand".
    const text = intent ? ruleAnswer(intent, facts) : unknownAnswer(facts);
    return { text, source: "rules", intent, links: suggestLinks(message), canForward: true };
  }
}
