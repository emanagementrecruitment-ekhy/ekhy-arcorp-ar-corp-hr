import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { licensingConfigured, getEmployeeLimit, validateUpgradeCode } from "@/lib/license";

export async function GET() {
  try {
    await requireSession(OFFICE_ROLES);
    const [employeeLimit, currentCount] = await Promise.all([
      getEmployeeLimit(),
      prisma.employee.count({ where: { accessRole: "KARYAWAN" } }),
    ]);

    return NextResponse.json({
      licensingConfigured: licensingConfigured(),
      employeeLimit,
      currentCount,
    });
  } catch (e) {
    return apiError(e);
  }
}

/** Owner/Consultant redeem a one-time upgrade code from the vendor to raise this deployment's employee/Tera cap — see src/lib/license.ts. */
export async function POST(req: Request) {
  try {
    await requireSession(["OWNER", "CONSULTANT"]);
    const body = await req.json().catch(() => null);
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!code) return NextResponse.json({ error: "Kode upgrade wajib diisi." }, { status: 400 });

    const result = await validateUpgradeCode(code);
    if (!result.ok) return NextResponse.json({ error: result.error ?? "Kode upgrade tidak valid." }, { status: 403 });

    return NextResponse.json({ ok: true, employeeLimit: result.employeeLimit });
  } catch (e) {
    return apiError(e);
  }
}
