import { NextResponse } from "next/server";
import { findEmployeeForPortal, normalizeIdentifier, type Portal } from "@/lib/lookup";
import { issueOtp } from "@/lib/otp";
import { DEMO_TERA_CODE } from "@/lib/constants";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier : "";
  const portal: Portal = body?.portal === "pusat" ? "pusat" : "karyawan";

  if (!identifier.trim()) {
    return NextResponse.json({ error: "Masukkan email terdaftar atau nomor HP." }, { status: 400 });
  }

  // Caps both "spam one target's inbox/WhatsApp" and "hammer many accounts
  // from one IP" — each OTP request costs a real send (or, worse, is free
  // ammunition for guessing it), so this is the actual brute-force gate.
  const ip = clientIp(req);
  const normalized = identifier.trim().toLowerCase();
  if (!rateLimit(`otp-req:ip:${ip}`, 20, 10 * 60_000) || !rateLimit(`otp-req:id:${normalized}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Terlalu banyak permintaan kode. Coba lagi beberapa menit lagi." }, { status: 429 });
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
