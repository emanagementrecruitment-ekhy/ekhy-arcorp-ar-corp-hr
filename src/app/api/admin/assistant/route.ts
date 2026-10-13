import { NextResponse } from "next/server";
import { requireSession, apiError, ApiAuthError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { getAssistantSnapshot, remindUncheckedNow, setAssistantEnabled } from "@/lib/assistant";

export async function GET() {
  try {
    await requireSession([...OFFICE_ROLES]);
    return NextResponse.json(await getAssistantSnapshot());
  } catch (e) {
    return apiError(e);
  }
}

/** { action: "remind" } pushes to everyone who has not checked in; { action: "toggle", enabled } pauses/resumes the automatic tasks. */
export async function POST(req: Request) {
  try {
    const session = await requireSession([...OFFICE_ROLES]);
    const body = await req.json().catch(() => null);

    if (body?.action === "remind") {
      if (!rateLimit(`assistant-remind:${session.employeeId}`, 3, 10 * 60_000)) {
        throw new ApiAuthError(429, "Terlalu sering. Tunggu beberapa menit sebelum mengingatkan lagi.");
      }
      const out = await remindUncheckedNow();
      await logAudit(session, "ASSISTANT_REMIND", "Asisten Harian", out.summary);
      return NextResponse.json({ ok: true, ...out });
    }

    if (body?.action === "toggle" && typeof body.enabled === "boolean") {
      await setAssistantEnabled(body.enabled);
      await logAudit(session, "ASSISTANT_TOGGLE", "Asisten Harian", body.enabled ? "Dinyalakan" : "Dijeda");
      return NextResponse.json({ ok: true, enabled: body.enabled });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
  } catch (e) {
    return apiError(e);
  }
}
