import { NextResponse } from "next/server";
import { findEmployeeForPortal, type Portal } from "@/lib/lookup";
import { verifyOtp } from "@/lib/otp";
import { createSession } from "@/lib/auth";
import type { AccessRole } from "@/lib/constants";

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

  return NextResponse.json({
    ok: true,
    accessRole: employee.accessRole,
    // Field staff still need to complete the GPS attendance step; office accounts go straight in.
    requiresAttendance: employee.accessRole === "KARYAWAN",
  });
}
