import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { SETTING_ID } from "@/lib/settings";

/** Whether the logged-in Owner still owes a showing of the one-time activation welcome screen. */
export async function GET() {
  try {
    const session = await requireSession(["OWNER"]);
    const [owner, setting] = await Promise.all([
      prisma.employee.findUnique({ where: { id: session.employeeId } }),
      prisma.appSetting.findUnique({ where: { id: SETTING_ID } }),
    ]);

    const shouldShow = Boolean(setting?.ownerGeneratedAt) && !setting?.ownerWelcomeSeenAt;
    return NextResponse.json({ shouldShow, name: owner?.name ?? "" });
  } catch (e) {
    return apiError(e);
  }
}
