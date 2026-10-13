import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";
import { buildPayslip, ensureRecurringCosts } from "./payslip";
import { monthLabel } from "./format";
import { getActiveAnnouncementText } from "./settings";
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

export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
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
  client ??= new Anthropic({ timeout: 45_000, maxRetries: 1 });
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

/** One assistant turn: rules first, Claude for everything the rules cannot understand. */
export async function answerEmployee(employeeId: string, message: string, history: ChatTurn[]): Promise<AssistantReply> {
  const facts = await buildEmployeeFacts(employeeId);
  const intent = matchIntent(message);
  const useAi = aiConfigured();
  const requestLike = intent === "request";

  // A short, clear question is answered by the rules (free, instant). A long or unclear one deserves real
  // understanding — that's where Claude is worth its cost.
  if (intent && (!useAi || wordCount(message) <= 10 || requestLike)) {
    const text = ruleAnswer(intent, facts);
    return { text, source: "rules", intent, links: suggestLinks(message), canForward: requestLike };
  }

  if (!useAi) {
    return { text: unknownAnswer(facts), source: "rules", intent: null, links: [], canForward: true };
  }

  try {
    const text = await askClaude(facts, history, message);
    const wantsOffice = /kirim ke kantor/i.test(text);
    return { text, source: "ai", intent, links: suggestLinks(message, text), canForward: wantsOffice };
  } catch (e) {
    console.error("[ai-assistant] Claude call failed:", e instanceof Error ? e.message : e);
    // Never leave the employee with a dead end: fall back to the rules, or to the polite "didn't understand".
    const text = intent ? ruleAnswer(intent, facts) : unknownAnswer(facts);
    return { text, source: "rules", intent, links: suggestLinks(message), canForward: true };
  }
}
