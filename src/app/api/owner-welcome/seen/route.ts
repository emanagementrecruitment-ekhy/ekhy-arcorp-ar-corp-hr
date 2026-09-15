import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { SETTING_ID } from "@/lib/settings";

export async function POST() {
  try {
    await requireSession(["OWNER"]);
    await prisma.appSetting.update({ where: { id: SETTING_ID }, data: { ownerWelcomeSeenAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
