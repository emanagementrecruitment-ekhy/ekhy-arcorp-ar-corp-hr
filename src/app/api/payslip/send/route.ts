import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/api-auth";
import { parseMonth } from "@/lib/period";
import { rateLimit } from "@/lib/rate-limit";
import { deliverPayslip } from "@/lib/payslip-delivery";

export async function POST(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN", "SUPERVISOR"]);
    // Each call emails/WhatsApps a PDF — cap it so it can't drain the Brevo/Fonnte quota.
    if (!rateLimit(`payslip-send:${session.employeeId}`, 3, 60 * 60_000)) {
      return NextResponse.json({ error: "Terlalu sering mengirim Slip Pay. Coba lagi dalam satu jam." }, { status: 429 });
    }
    const body = await req.json().catch(() => null);
    const month = parseMonth(typeof body?.month === "string" ? body.month : null);

    const result = await deliverPayslip(session.employeeId, month);
    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}
