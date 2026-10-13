import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { jakartaClock } from "./assistant-rules";
import { aiLimitsFromEnv, type AiGate } from "./ai-limits";

/**
 * Counts every question Ara sends to Claude and refuses once the daily allowance is spent. The allowance is stored
 * in the database (not memory), so a restart or a second server instance cannot reset it, and the increment is a
 * single guarded UPDATE so two requests racing for the last slot cannot both get it.
 */

const GLOBAL_SCOPE = "global";

async function takeSlot(dateKey: string, scope: string, limit: number): Promise<boolean> {
  if (limit <= 0) return false;
  try {
    await prisma.aiUsage.create({ data: { dateKey, scope, count: 0 } });
  } catch (e) {
    // Another request created the row first: that is fine, the guarded update below does the real work.
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }
  const { count } = await prisma.aiUsage.updateMany({
    where: { dateKey, scope, count: { lt: limit } },
    data: { count: { increment: 1 } },
  });
  return count === 1;
}

/** Reserves one Claude question for this person today; call it right before asking Claude. */
export async function tryConsumeAi(employeeId: string, isOffice: boolean, now = new Date()): Promise<AiGate> {
  const dateKey = jakartaClock(now).dateKey;
  const limits = aiLimitsFromEnv(process.env);
  const userScope = `u:${employeeId}`;

  if (!(await takeSlot(dateKey, userScope, isOffice ? limits.perAdmin : limits.perUser))) return { ok: false, reason: "user" };
  if (!(await takeSlot(dateKey, GLOBAL_SCOPE, limits.global))) {
    // The app-wide cap is spent: hand this person's slot back so their own count stays honest.
    await prisma.aiUsage.updateMany({ where: { dateKey, scope: userScope, count: { gt: 0 } }, data: { count: { decrement: 1 } } });
    return { ok: false, reason: "global" };
  }
  return { ok: true };
}

export async function getAiUsageToday(now = new Date()): Promise<{ used: number; limit: number }> {
  const dateKey = jakartaClock(now).dateKey;
  const row = await prisma.aiUsage.findUnique({ where: { dateKey_scope: { dateKey, scope: GLOBAL_SCOPE } } });
  return { used: row?.count ?? 0, limit: aiLimitsFromEnv(process.env).global };
}
