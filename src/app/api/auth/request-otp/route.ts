import { NextResponse } from "next/server";
import { findEmployeeForPortal, normalizeIdentifier, type Portal } from "@/lib/lookup";
import { issueOtp } from "@/lib/otp";
import { DEMO_TERA_CODE } from "@/lib/constants";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier : "";
  const portal: Portal = body?.portal === "pusat" ? "pusat" : "karyawan";

  if (!identifier.trim()) {
    return NextResponse.json({ error: "Masukkan email terdaftar atau nomor HP." }, { status: 400 });
  }

  // AR Corp Desktop's offline fallback (see desktop/) is scoped to office
  // staff only — karyawan/Tera keep using the phone app, which also sidesteps
  // syncing offline karyawan data back through a later office-only login.
  if (process.env.ARCORP_LOCAL_MODE === "1" && portal !== "pusat") {
    return NextResponse.json(
      { error: "Mode offline kantor hanya untuk akun Admin/Owner/Consultant/Kepala Mess. Karyawan tetap pakai aplikasi HP seperti biasa." },
      { status: 403 }
    );
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
  const isDemo = employee.code === DEMO_TERA_CODE;
  const { devCode, delivered } = await issueOtp(employee.id, target, kind, isDemo);

  return NextResponse.json({
    ok: true,
    maskedTarget: target,
    delivered,
    devCode,
    isDemo,
  });
}
