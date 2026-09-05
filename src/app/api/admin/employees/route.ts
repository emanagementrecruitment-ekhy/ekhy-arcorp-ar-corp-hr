import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { shortRp } from "@/lib/format";

export async function GET() {
  try {
    await requireSession(OFFICE_ROLES);

    const start30 = new Date(Date.now() - 29 * 864e5);
    const employees = await prisma.employee.findMany({
      where: { accessRole: "KARYAWAN" },
      include: {
        vouchers: { where: { occurredAt: { gte: start30 } } },
        kasbonRequests: { where: { status: "DISETUJUI" } },
      },
      orderBy: { code: "asc" },
    });

    return NextResponse.json({
      employees: employees.map((e) => {
        const kasApproved = e.kasbonRequests.reduce((s, k) => s + k.amount, 0);
        return {
          name: e.name,
          code: e.code,
          role: e.role,
          level: e.level,
          email: e.email,
          phone: e.phone,
          count: `${e.vouchers.length} vc`,
          kasbon: kasApproved ? shortRp(kasApproved) : "—",
          total: shortRp(e.vouchers.reduce((s, v) => s + v.amount, 0)),
        };
      }),
    });
  } catch (e) {
    return apiError(e);
  }
}
