import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { timeLabel } from "@/lib/format";

export async function GET() {
  try {
    const session = await requireSession(["KARYAWAN"]);
    const [employee, messages] = await Promise.all([
      prisma.employee.findUniqueOrThrow({
        where: { id: session.employeeId },
        include: { supervisor: true },
      }),
      prisma.chatMessage.findMany({
        where: { employeeId: session.employeeId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({
      supervisor: employee.supervisor
        ? { name: employee.supervisor.name, role: employee.supervisor.role }
        : null,
      messages: messages.map((m) => ({
        id: m.id,
        me: !m.fromSupervisor,
        text: m.text,
        time: timeLabel(m.createdAt),
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN"]);
    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });

    const message = await prisma.chatMessage.create({
      data: {
        employeeId: session.employeeId,
        senderId: session.employeeId,
        fromSupervisor: false,
        text,
      },
    });

    return NextResponse.json({
      ok: true,
      message: { id: message.id, me: true, text: message.text, time: timeLabel(message.createdAt) },
    });
  } catch (e) {
    return apiError(e);
  }
}
