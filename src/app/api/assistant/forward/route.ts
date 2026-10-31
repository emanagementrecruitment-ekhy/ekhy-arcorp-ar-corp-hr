import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { notifyOffice } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { AUTO_RECEIPT_TEXT, forwardedChatText } from "@/lib/ara-forward";
import { OFFICE_ROLES } from "@/lib/constants";

const MAX_MESSAGE = 500;

// The employee's own wish (izin, cuti, keluhan, ...) handed to the office. The assistant never decides anything
// itself — this just makes sure a human sees it. The office roles use the same button in Angel's admin mode for a
// question Angel could not answer: that only rings the Owner/Admin bell (the office has no Lapor thread).
export async function POST(req: Request) {
  try {
    const session = await requireSession([...OFFICE_ROLES, "KARYAWAN", "SUPERVISOR"]);
    const isOffice = (OFFICE_ROLES as readonly string[]).includes(session.accessRole);
    const body = (await req.json().catch(() => null)) as { message?: unknown } | null;
    const message = typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
    if (!message) return NextResponse.json({ error: "Pesan kosong." }, { status: 400 });
    if (!rateLimit(`assistant:forward:${session.employeeId}`, 5, 60 * 60_000)) {
      return NextResponse.json({ error: "Kamu sudah mengirim beberapa pesan. Tunggu sebentar ya." }, { status: 429 });
    }

    if (isOffice) {
      await notifyOffice(`Pertanyaan dari ${session.name} (${session.accessRole}) untuk Owner/Admin lewat asisten Angel: "${message}"`);
      await logAudit(session, "ASSISTANT_FORWARD", session.name, message.slice(0, 160));
      return NextResponse.json({ ok: true });
    }

    // Put it in the employee's chat thread (Lapor ↔ Lapor Lapangan) so Owner/Admin can answer there, then a fixed
    // receipt. Explicit, increasing timestamps keep the order stable (SQLite stores milliseconds).
    const now = Date.now();
    await prisma.$transaction([
      prisma.chatMessage.create({
        data: { employeeId: session.employeeId, senderId: session.employeeId, fromSupervisor: false, text: forwardedChatText(message), createdAt: new Date(now) },
      }),
      prisma.chatMessage.create({
        data: { employeeId: session.employeeId, senderId: null, fromSupervisor: true, text: AUTO_RECEIPT_TEXT, createdAt: new Date(now + 1) },
      }),
    ]);

    await notifyOffice(`Permintaan dari ${session.name} (${session.code}) lewat asisten Angel: "${message}"`);
    await logAudit(session, "ASSISTANT_FORWARD", session.name, message.slice(0, 160));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
