import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { EMPLOYEE_LEVELS, FIELD_CITIES, usesVcr, type EmployeeLevel } from "@/lib/constants";

/**
 * A lighter-weight sibling of PATCH /api/admin/employees/[id] for the two
 * fields the Slip Pay screen needs to fix on the spot (Grade, Outlet/Lokasi
 * Kerja) without re-submitting the whole Data Karyawan form. Deliberately
 * excludes level "MANUAL" — that needs a customRate alongside it, which this
 * quick form has no field for; an employee already on MANUAL keeps it
 * (grade just isn't editable here) rather than being silently reset.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["OWNER", "CONSULTANT"]);
    const { id } = await params;
    const body = await req.json().catch(() => null);

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing || existing.accessRole !== "KARYAWAN") {
      return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    }

    const place = typeof body?.place === "string" ? body.place : "";
    const city = FIELD_CITIES.find((c) => c.place === place);
    if (!city) return NextResponse.json({ error: "Outlet/Lokasi Kerja tidak valid." }, { status: 400 });

    // `level` is optional: omit it to change only the outlet — used when the
    // employee is currently on MANUAL grade, which this quick form can't
    // safely reassign away from (no customRate field here) or back onto.
    const vcr = usesVcr(existing.role);
    let level: EmployeeLevel | undefined;
    if (vcr && body?.level !== undefined) {
      const levelRaw = body.level as EmployeeLevel;
      if (!EMPLOYEE_LEVELS.includes(levelRaw) || levelRaw === "MANUAL") {
        return NextResponse.json({ error: "Grade tidak valid." }, { status: 400 });
      }
      level = levelRaw;
    }

    await prisma.employee.update({
      where: { id },
      data: {
        homePlace: city.place,
        homeLat: city.lat,
        homeLng: city.lng,
        ...(level ? { level } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
