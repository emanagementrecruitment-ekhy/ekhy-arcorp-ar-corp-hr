import { NextResponse } from "next/server";
import { findEmployeeForPortal, type Portal } from "@/lib/lookup";
import { verifyOtp } from "@/lib/otp";
import { createSession } from "@/lib/auth";
import { usesVcr, type AccessRole } from "@/lib/constants";
import { notifyOffice } from "@/lib/notify";
import { reportCheckin } from "@/lib/license";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const REASON_MESSAGE: Record<string, string> = {
  not_found: "Kode belum diminta atau sudah kedaluwarsa. Kirim ulang kode.",
  expired: "Kode sudah kedaluwarsa. Kirim ulang kode.",
  too_many_attempts: "Terlalu banyak percobaan. Kirim ulang kode.",
  mismatch: "Kode salah. Coba lagi.",
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier : "";
  const code = typeof body?.code === "string" ? body.code : "";
  const portal: Portal = body?.portal === "pusat" ? "pusat" : "karyawan";

  if (process.env.ARCORP_LOCAL_MODE === "1" && portal !== "pusat") {
    return NextResponse.json(
      { error: "Mode offline kantor hanya untuk akun Admin/Owner/Kepala Mess." },
      { status: 403 }
    );
  }

  // bcrypt.compare is deliberately slow — without this, hammering this
  // endpoint is a cheap way to burn CPU regardless of the per-code attempt
  // cap below (which only kicks in once an employee is resolved).
  if (!rateLimit(`otp-verify:ip:${clientIp(req)}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." }, { status: 429 });
  }

  const employee = await findEmployeeForPortal(identifier, portal);
  if (!employee) {
    return NextResponse.json({ error: "Akun tidak terdaftar." }, { status: 404 });
  }

  const result = await verifyOtp(employee.id, code);
  if (!result.ok) {
    return NextResponse.json({ error: REASON_MESSAGE[result.reason] }, { status: 400 });
  }

  await createSession({
    employeeId: employee.id,
    accessRole: employee.accessRole as AccessRole,
    name: employee.name,
    code: employee.code,
  });

  if (employee.accessRole !== "KARYAWAN") {
    reportCheckin();
    await notifyOffice(`${employee.name} (${employee.role}) login ke Office.`);
  } else if (usesVcr(employee.role)) {
    await notifyOffice(`${employee.name} (Tera) login.`);
  }

  return NextResponse.json({
    ok: true,
    accessRole: employee.accessRole,
    // Field staff still need to complete the GPS attendance step; office
    // accounts go straight in. SUPERVISOR (Kepala Mess) still absen like any
    // other employee — only OWNER/CONSULTANT/ADMIN_PUSAT skip it.
    requiresAttendance: employee.accessRole === "KARYAWAN" || employee.accessRole === "SUPERVISOR",
  });
}
