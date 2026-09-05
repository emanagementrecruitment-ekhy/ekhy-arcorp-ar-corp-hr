import { NextResponse } from "next/server";
import { findEmployeeForPortal, normalizeIdentifier, type Portal } from "@/lib/lookup";
import { issueOtp } from "@/lib/otp";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier : "";
  const portal: Portal = body?.portal === "pusat" ? "pusat" : "karyawan";

  if (!identifier.trim()) {
    return NextResponse.json({ error: "Masukkan email terdaftar atau nomor HP." }, { status: 400 });
  }

  const employee = await findEmployeeForPortal(identifier, portal);
  if (!employee) {
    return NextResponse.json(
      {
        error:
          portal === "pusat"
            ? "Akun tidak terdaftar. Gunakan email/HP kantor pusat yang terdaftar."
            : "Akun tidak terdaftar. Gunakan email/HP karyawan yang terdaftar.",
      },
      { status: 404 }
    );
  }

  const { kind } = normalizeIdentifier(identifier);
  const target = kind === "email" ? employee.email : employee.phone;
  const { devCode, delivered } = await issueOtp(employee.id, target, kind);

  return NextResponse.json({
    ok: true,
    maskedTarget: target,
    delivered,
    devCode,
  });
}
