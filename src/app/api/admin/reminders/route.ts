import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";

// Karyawan + Supervisor (Kepala Mess) are the two accessRoles that actually
// use the /app portal on their phone — see the redirect check in
// src/app/app/layout.tsx. "Semua" targets exactly this set.
const PORTAL_ROLES = ["KARYAWAN", "SUPERVISOR"] as const;

export async function GET(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const reminders = await prisma.reminder.findMany({
      where: {
        ...(from || to
          ? {
              scheduledAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { recipients: { include: { employee: { select: { id: true, name: true, code: true } } } } },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json({
      reminders: reminders.map((r) => ({
        id: r.id,
        title: r.title,
        message: r.message,
        scheduledAt: r.scheduledAt,
        sentAt: r.sentAt,
        createdByName: r.createdByName,
        recipients: r.recipients.map((rec) => ({ id: rec.employee.id, name: rec.employee.name, code: rec.employee.code })),
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(OFFICE_ROLES);
    const body = await req.json().catch(() => null);

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const scheduledAtRaw = typeof body?.scheduledAt === "string" ? body.scheduledAt : "";
    const targetAll = Boolean(body?.targetAll);
    const employeeIds: string[] = Array.isArray(body?.employeeIds) ? body.employeeIds.filter((x: unknown) => typeof x === "string") : [];

    if (!title) return NextResponse.json({ error: "Judul wajib diisi." }, { status: 400 });
    if (!message) return NextResponse.json({ error: "Pesan wajib diisi." }, { status: 400 });
    const scheduledAt = new Date(scheduledAtRaw);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json({ error: "Tanggal/jam pengingat tidak valid." }, { status: 400 });
    }
    if (!targetAll && employeeIds.length === 0) {
      return NextResponse.json({ error: "Pilih penerima atau centang Semua Karyawan/Tera." }, { status: 400 });
    }

    const recipientIds = targetAll
      ? (await prisma.employee.findMany({ where: { accessRole: { in: [...PORTAL_ROLES] } }, select: { id: true } })).map((e) => e.id)
      : (await prisma.employee.findMany({ where: { id: { in: employeeIds }, accessRole: { in: [...PORTAL_ROLES] } }, select: { id: true } })).map(
          (e) => e.id
        );

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: "Tidak ada penerima yang valid." }, { status: 400 });
    }

    const reminder = await prisma.reminder.create({
      data: {
        title,
        message,
        scheduledAt,
        createdById: session.employeeId,
        createdByName: session.name,
        recipients: { create: recipientIds.map((employeeId) => ({ employeeId })) },
      },
    });

    return NextResponse.json({ ok: true, id: reminder.id, recipientCount: recipientIds.length });
  } catch (e) {
    return apiError(e);
  }
}
