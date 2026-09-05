import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { parsePeriod, periodStart, PERIOD_LABEL } from "@/lib/period";
import { shortRp } from "@/lib/format";

export async function GET(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const { searchParams } = new URL(req.url);
    const period = parsePeriod(searchParams.get("period"));
    const now = new Date();
    const start = periodStart(now, period);

    const employees = await prisma.employee.findMany({
      where: { accessRole: "KARYAWAN" },
      include: {
        vouchers: { where: { occurredAt: { gte: start } } },
        kasbonRequests: { where: { status: "DISETUJUI", createdAt: { gte: start } } },
      },
      orderBy: { code: "asc" },
    });

    const rows = employees.map((e) => {
      const silver = e.vouchers.filter((v) => v.category === "SILVER").length;
      const plat = e.vouchers.filter((v) => v.category === "PLATINUM").length;
      const gross = e.vouchers.reduce((s, v) => s + v.amount, 0);
      const ks = e.kasbonRequests.reduce((s, k) => s + k.amount, 0);
      return {
        name: e.name, level: e.level, silver, plat,
        kasbon: ks ? "-" + shortRp(ks) : "—",
        net: shortRp(gross - ks),
        gross, ks,
      };
    });

    return NextResponse.json({
      period,
      periodLabel: PERIOD_LABEL[period],
      rows,
      totals: {
        silver: rows.reduce((s, r) => s + r.silver, 0),
        plat: rows.reduce((s, r) => s + r.plat, 0),
        kasbon: (() => {
          const sum = rows.reduce((s, r) => s + r.ks, 0);
          return sum ? "-" + shortRp(sum) : "—";
        })(),
        net: shortRp(rows.reduce((s, r) => s + (r.gross - r.ks), 0)),
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
