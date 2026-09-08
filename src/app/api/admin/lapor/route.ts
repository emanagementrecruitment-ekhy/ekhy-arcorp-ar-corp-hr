import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { timeLabel, dLabel } from "@/lib/format";

// Admin Pusat can only view (per its scoped duties); replying is Kepala
// Mess's job, and Owner/Consultant retain full control as usual.
const REPLIERS = ["OWNER", "CONSULTANT", "SUPERVISOR"] as const;

export async function GET(req: Request) {
  try {
    // Also open to SUPERVISOR (Kepala Mess) — the one admin view that role can see.
    await requireSession([...OFFICE_ROLES, "SUPERVISOR"]);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    if (employeeId) {
      const [employee, messages] = await Promise.all([
        prisma.employee.findUniqueOrThrow({ where: { id: employeeId } }),
        prisma.chatMessage.findMany({ where: { employeeId }, orderBy: { createdAt: "asc" } }),
      ]);
      return NextResponse.json({
        employee: { id: employee.id, name: employee.name, code: employee.code, place: employee.homePlace },
        messages: messages.map((m) => ({
          id: m.id,
          fromSupervisor: m.fromSupervisor,
          text: m.text,
          time: `${dLabel(m.createdAt)} ${timeLabel(m.createdAt)}`,
        })),
      });
    }

    const employees = await prisma.employee.findMany({
      where: { accessRole: "KARYAWAN", chatsAsEmployee: { some: {} } },
      include: { chatsAsEmployee: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    const threads = employees
      .map((e) => {
        const last = e.chatsAsEmployee[0];
        return {
          id: e.id,
          name: e.name,
          code: e.code,
          place: e.homePlace,
          lastText: last?.text ?? "",
          lastAt: last?.createdAt ?? new Date(0),
        };
      })
      .sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime())
      .map(({ lastAt, ...t }) => ({ ...t, lastTime: timeLabel(lastAt) }));

    return NextResponse.json({ threads });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession([...REPLIERS]);
    const body = await req.json().catch(() => null);
    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!employeeId) return NextResponse.json({ error: "Karyawan tidak valid." }, { status: 400 });
    if (!text) return NextResponse.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });

    const message = await prisma.chatMessage.create({
      data: { employeeId, senderId: session.employeeId, fromSupervisor: true, text },
    });

    return NextResponse.json({
      ok: true,
      message: {
        id: message.id,
        fromSupervisor: true,
        text: message.text,
        time: `${dLabel(message.createdAt)} ${timeLabel(message.createdAt)}`,
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
