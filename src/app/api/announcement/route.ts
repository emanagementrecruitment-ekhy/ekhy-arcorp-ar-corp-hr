import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { getActiveAnnouncementText } from "@/lib/settings";

/** Read-only — any logged-in session can see the current running-text banner (respects its start/end schedule). */
export async function GET() {
  try {
    await requireSession();
    const text = await getActiveAnnouncementText();
    return NextResponse.json({ text });
  } catch (e) {
    return apiError(e);
  }
}
