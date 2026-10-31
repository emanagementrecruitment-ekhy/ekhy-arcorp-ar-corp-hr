import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { employeeAiConfigured, answerEmployee } from "@/lib/ai-assistant";
import { sanitizeHistory } from "@/lib/ai-assistant-rules";

const MAX_MESSAGE = 500;

export async function POST(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN", "SUPERVISOR"]);
    const body = (await req.json().catch(() => null)) as { message?: unknown; history?: unknown } | null;
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
    if (!message) return NextResponse.json({ error: "Tulis pertanyaanmu dulu ya." }, { status: 400 });

    // Per-employee brakes: a burst limit, plus a daily ceiling that caps what the AI can cost.
    if (!rateLimit(`assistant:burst:${session.employeeId}`, 12, 60_000)) {
      return NextResponse.json({ error: "Pelan-pelan ya, tunggu sebentar lalu tanya lagi." }, { status: 429 });
    }
    if (!rateLimit(`assistant:day:${session.employeeId}`, 80, 24 * 60 * 60_000)) {
      return NextResponse.json({ error: "Batas tanya hari ini sudah tercapai. Coba lagi besok atau hubungi Call Center." }, { status: 429 });
    }

    const reply = await answerEmployee(session.employeeId, message, sanitizeHistory(body?.history));
    // Questions that went to Claude leave the server, so they are logged for the Owner (rule answers stay private).
    if (reply.source === "ai") await logAudit(session, "ASSISTANT_ASK", session.name, message.slice(0, 160));
    return NextResponse.json({ ...reply, aiConfigured: employeeAiConfigured() });
  } catch (e) {
    return apiError(e);
  }
}
