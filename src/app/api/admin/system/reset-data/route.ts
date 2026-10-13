import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { requireSession, apiError, ApiAuthError } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { resetAppData } from "@/lib/data-reset";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const OWNER_ROLES = ["OWNER", "CONSULTANT"] as const;
const CONFIRM_WORD = "RESET";

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Full "back to zero" reset. Same developer code as the appearance reset (RESET_PASSCODE, only in the server
// environment) plus a typed confirmation, and Owner-only — this is irreversible.
export async function POST(req: Request) {
  try {
    const session = await requireSession([...OWNER_ROLES]);

    if (!rateLimit(`data-reset:${session.employeeId}`, 5, 10 * 60_000) || !rateLimit(`data-reset:ip:${clientIp(req)}`, 10, 10 * 60_000)) {
      throw new ApiAuthError(429, "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.");
    }

    const configured = process.env.RESET_PASSCODE;
    if (!configured) {
      throw new ApiAuthError(500, "RESET_PASSCODE belum diatur di server — hubungi vendor/penyedia aplikasi untuk mengonfigurasinya.");
    }

    const body = await req.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code : "";
    const confirm = typeof body?.confirm === "string" ? body.confirm.trim() : "";
    const removeSeatHolders = body?.removeSeatHolders === true;

    if (!sameSecret(code, configured)) {
      throw new ApiAuthError(403, "Kode salah — minta kode reset ke vendor/penyedia aplikasi.");
    }
    if (confirm !== CONFIRM_WORD) {
      return NextResponse.json({ error: `Ketik ${CONFIRM_WORD} untuk memastikan.` }, { status: 400 });
    }

    const result = await resetAppData({ removeSeatHolders });
    await logAudit(
      session,
      "DATA_RESET",
      "Seluruh data Tera & karyawan",
      `${result.employeesRemoved} Tera/karyawan dihapus, semua transaksi dikosongkan${removeSeatHolders ? ", pemegang jabatan ikut dihapus" : `, ${result.seatHoldersKept} pemegang jabatan dipertahankan`}`,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return apiError(e);
  }
}
