import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { notifyOffice } from "@/lib/notify";

const MAX_MESSAGE = 500;

// The employee's own wish (izin, cuti, keluhan, ...) handed to the office. The assistant never decides anything
// itself — this just makes sure a human sees it.
export async function POST(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN", "SUPERVISOR"]);
    const body = (await req.json().catch(() => null)) as { message?: unknown } | null;
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
    if (!message) return NextResponse.json({ error: "Pesan kosong." }, { status: 400 });
    if (!rateLimit(`assistant:forward:${session.employeeId}`, 5, 60 * 60_000)) {
      return NextResponse.json({ error: "Kamu sudah mengirim beberapa pesan. Tunggu sebentar ya." }, { status: 429 });
    }

    await notifyOffice(`Permintaan dari ${session.name} (${session.code}) lewat asisten Ara: "${message}"`);
    await logAudit(session, "ASSISTANT_FORWARD", session.name, message.slice(0, 160));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
