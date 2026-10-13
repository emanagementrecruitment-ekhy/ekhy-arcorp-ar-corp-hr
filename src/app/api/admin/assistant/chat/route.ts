import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { answerAdmin } from "@/lib/ai-admin";
import { aiConfigured } from "@/lib/ai-assistant";
import { sanitizeHistory } from "@/lib/ai-assistant-rules";

const MAX_MESSAGE = 500;

// Ara for the office: read-only questions about employees. Same brakes as the employee side, higher allowance.
export async function POST(req: Request) {
  try {
    const session = await requireSession(OFFICE_ROLES);
    const body = (await req.json().catch(() => null)) as { message?: unknown; history?: unknown } | null;
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
    if (!message) return NextResponse.json({ error: "Tulis pertanyaannya dulu ya." }, { status: 400 });

    if (!rateLimit(`assistant-admin:burst:${session.employeeId}`, 20, 60_000)) {
      return NextResponse.json({ error: "Pelan-pelan ya, tunggu sebentar lalu tanya lagi." }, { status: 429 });
    }
    if (!rateLimit(`assistant-admin:day:${session.employeeId}`, 200, 24 * 60 * 60_000)) {
      return NextResponse.json({ error: "Batas tanya hari ini sudah tercapai." }, { status: 429 });
    }

    const reply = await answerAdmin(session.employeeId, session.name, message, sanitizeHistory(body?.history));
    // Questions handed to Claude leave the server, so they are logged for the Owner (rule answers are not).
    if (reply.source === "ai") await logAudit(session, "ASSISTANT_ADMIN_ASK", session.name, message.slice(0, 160));
    return NextResponse.json({ text: reply.text, source: reply.source, links: reply.links, canForward: false, aiConfigured: aiConfigured() });
  } catch (e) {
    return apiError(e);
  }
}
