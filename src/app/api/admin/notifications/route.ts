import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { timeLabel, dLabel } from "@/lib/format";

const NOTIFIABLE_ROLES = ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "SUPERVISOR"] as const;

export async function GET() {
  try {
    const session = await requireSession([...NOTIFIABLE_ROLES]);
    const notifications = await prisma.notification.findMany({
      where: { recipientRole: session.accessRole },
      orderBy: { createdAt: "desc" },
      take: 15,
    });
    const unreadCount = await prisma.notification.count({
      where: { recipientRole: session.accessRole, readAt: null },
    });
    return NextResponse.json({
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n.id,
        text: n.text,
        time: `${dLabel(n.createdAt)} · ${timeLabel(n.createdAt)}`,
        read: Boolean(n.readAt),
      })),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST() {
  try {
    const session = await requireSession([...NOTIFIABLE_ROLES]);
    await prisma.notification.updateMany({
      where: { recipientRole: session.accessRole, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
