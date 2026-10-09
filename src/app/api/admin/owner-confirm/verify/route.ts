import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { checkOwnerCode, grantArchiveUnlock } from "@/lib/owner-confirm";
import { rateLimit } from "@/lib/rate-limit";

/** Checks the Owner's code and, if right, unlocks the resign archive for this person for 15 minutes. */
export async function POST(req: Request) {
  try {
    const session = await requireSession(["OWNER", "CONSULTANT", "MANAGER"]);
    if (!rateLimit(`owner-confirm:verify:${session.employeeId}`, 10, 10 * 60_000)) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." }, { status: 429 });
    }
    const body = await req.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code : "";
    if (!(await checkOwnerCode(code))) {
      return NextResponse.json({ error: "Kode salah atau sudah kedaluwarsa." }, { status: 403 });
    }
    await grantArchiveUnlock(session.employeeId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
