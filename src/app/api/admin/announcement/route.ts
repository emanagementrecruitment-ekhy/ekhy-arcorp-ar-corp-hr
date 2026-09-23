import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { getAnnouncement, SETTING_ID } from "@/lib/settings";

const MANAGERS = ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] as const;

export async function GET() {
  try {
    await requireSession([...MANAGERS]);
    const announcement = await getAnnouncement();
    return NextResponse.json(announcement);
  } catch (e) {
    return apiError(e);
  }
}

/**
 * Sets or clears the running-text banner karyawan/Tera see below the logo,
 * and its optional schedule window. `startAt`/`endAt` are ISO datetime
 * strings or null — null startAt shows the banner immediately, null endAt
 * runs it forever ("selamanya").
 */
export async function PUT(req: Request) {
  try {
    const session = await requireSession([...MANAGERS]);
    const body = await req.json().catch(() => null);
    const textRaw = typeof body?.text === "string" ? body.text.trim() : "";

    function parseDate(v: unknown): Date | null {
      if (typeof v !== "string" || !v) return null;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const startAt = parseDate(body?.startAt);
    const endAt = parseDate(body?.endAt);
    if (startAt && endAt && endAt < startAt) {
      return NextResponse.json({ error: "Waktu berhenti tidak boleh sebelum waktu mulai." }, { status: 400 });
    }

    await prisma.appSetting.upsert({
      where: { id: SETTING_ID },
      update: {
        announcementText: textRaw || null,
        announcementStartAt: startAt,
        announcementEndAt: endAt,
        announcementUpdatedAt: new Date(),
        announcementUpdatedById: session.employeeId,
      },
      create: {
        id: SETTING_ID,
        announcementText: textRaw || null,
        announcementStartAt: startAt,
        announcementEndAt: endAt,
        announcementUpdatedAt: new Date(),
        announcementUpdatedById: session.employeeId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
