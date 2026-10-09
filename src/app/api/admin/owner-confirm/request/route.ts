import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { sendOwnerCode } from "@/lib/owner-confirm";
import { rateLimit } from "@/lib/rate-limit";

/** Emails a confirmation code to the Owner. Used to unlock the resign archive and to confirm deleting an employee. */
export async function POST() {
  try {
    const session = await requireSession(["OWNER", "CONSULTANT", "MANAGER"]);
    if (!rateLimit(`owner-confirm:req:${session.employeeId}`, 5, 10 * 60_000)) {
      return NextResponse.json({ error: "Terlalu sering meminta kode. Coba lagi beberapa menit lagi." }, { status: 429 });
    }
    const sent = await sendOwnerCode();
    if (!sent) return NextResponse.json({ error: "Akun Owner tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, sentTo: sent.sentTo, delivered: sent.delivered, devCode: sent.devCode });
  } catch (e) {
    return apiError(e);
  }
}
