import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError, ApiAuthError } from "@/lib/api-auth";
import { APPOINTABLE_ROLES } from "@/lib/constants";

const MANAGERS = ["OWNER", "CONSULTANT"] as const;

export async function GET() {
  try {
    await requireSession([...MANAGERS]);

    const seats = await Promise.all(
      APPOINTABLE_ROLES.map(async (seat) => {
        const [holder, candidates] = await Promise.all([
          prisma.employee.findFirst({ where: { accessRole: seat.accessRole }, orderBy: { createdAt: "asc" } }),
          prisma.employee.findMany({
            where: { accessRole: "KARYAWAN", role: seat.peran },
            select: { id: true, name: true, code: true },
            orderBy: { name: "asc" },
          }),
        ]);
        return {
          peran: seat.peran,
          accessRole: seat.accessRole,
          label: seat.label,
          holder: holder ? { id: holder.id, name: holder.name, code: holder.code, email: holder.email } : null,
          candidates,
        };
      })
    );

    return NextResponse.json({ seats });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireSession([...MANAGERS]);
    const body = await req.json().catch(() => null);
    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const peran = typeof body?.peran === "string" ? body.peran : "";

    const seat = APPOINTABLE_ROLES.find((s) => s.peran === peran);
    if (!seat) return NextResponse.json({ error: "Jabatan tidak dikenali." }, { status: 400 });

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.accessRole !== "KARYAWAN" || employee.role !== peran) {
      throw new ApiAuthError(400, `Karyawan ini belum punya Peran "${peran}" — ubah Peran-nya dulu di Data Karyawan.`);
    }

    await prisma.$transaction([
      // Whoever currently holds the seat is demoted back to a plain field employee.
      prisma.employee.updateMany({ where: { accessRole: seat.accessRole }, data: { accessRole: "KARYAWAN" } }),
      prisma.employee.update({ where: { id: employee.id }, data: { accessRole: seat.accessRole } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
