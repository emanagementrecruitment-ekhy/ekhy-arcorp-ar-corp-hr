import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES, EMPLOYEE_LEVELS, FIELD_CITIES, type EmployeeLevel } from "@/lib/constants";
import { shortRp } from "@/lib/format";
import { normalizeIdentifier } from "@/lib/lookup";

const PAGE_SIZE = 10;

export async function GET(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    // Internal callers (e.g. the supervisor picker) can ask for a bigger page
    // to get the full roster in one call; capped well above realistic org size.
    const pageSize = Math.min(500, Math.max(1, Number(searchParams.get("pageSize")) || PAGE_SIZE));

    // Phone matching only kicks in for a query that's substantially numeric —
    // a short digit run (e.g. the "05" left over from stripping "AR-05") would
    // otherwise false-match unrelated phone numbers that merely contain it.
    const qDigits = q.replace(/\D/g, "");
    const where = {
      accessRole: "KARYAWAN" as const,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { code: { contains: q } },
              { email: { contains: q } },
              ...(qDigits.length >= 5 ? [{ phone: { contains: qDigits } }] : []),
            ],
          }
        : {}),
    };

    const start30 = new Date(Date.now() - 29 * 864e5);
    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        include: {
          vouchers: { where: { occurredAt: { gte: start30 } } },
          kasbonRequests: { where: { status: "DISETUJUI" } },
        },
        orderBy: { code: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      employees: employees.map((e) => {
        const kasApproved = e.kasbonRequests.reduce((s, k) => s + k.amount, 0);
        return {
          id: e.id,
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
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (e) {
    return apiError(e);
  }
}

async function nextEmployeeCode() {
  const employees = await prisma.employee.findMany({
    where: { code: { startsWith: "AR-" } },
    select: { code: true },
  });
  const max = employees.reduce((m, e) => {
    const n = Number(e.code.slice(3));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `AR-${String(max + 1).padStart(2, "0")}`;
}

export async function POST(req: Request) {
  try {
    await requireSession(["OWNER", "CONSULTANT"]);
    const body = await req.json().catch(() => null);

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const emailRaw = typeof body?.email === "string" ? body.email.trim() : "";
    const phoneRaw = typeof body?.phone === "string" ? body.phone.trim() : "";
    const level = body?.level as EmployeeLevel;
    const role = typeof body?.role === "string" ? body.role.trim() : "";
    const place = typeof body?.place === "string" ? body.place : "";
    const supervisorId = typeof body?.supervisorId === "string" && body.supervisorId ? body.supervisorId : null;

    if (!name) return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    if (!role) return NextResponse.json({ error: "Peran wajib diisi." }, { status: 400 });
    if (!EMPLOYEE_LEVELS.includes(level)) {
      return NextResponse.json({ error: "Level tidak valid." }, { status: 400 });
    }

    const email = normalizeIdentifier(emailRaw);
    if (email.kind !== "email" || !email.value.includes(".")) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }
    const phone = normalizeIdentifier(phoneRaw);
    if (phone.kind !== "phone" || phone.value.length < 9) {
      return NextResponse.json({ error: "Nomor HP tidak valid." }, { status: 400 });
    }

    const city = FIELD_CITIES.find((c) => c.place === place);
    if (!city) return NextResponse.json({ error: "Kota/lokasi kerja tidak valid." }, { status: 400 });

    if (supervisorId) {
      const supervisor = await prisma.employee.findUnique({ where: { id: supervisorId } });
      if (!supervisor || supervisor.accessRole !== "KARYAWAN") {
        return NextResponse.json({ error: "Supervisor tidak valid." }, { status: 400 });
      }
    }

    const [emailTaken, phoneTaken] = await Promise.all([
      prisma.employee.findUnique({ where: { email: email.value } }),
      prisma.employee.findUnique({ where: { phone: phone.value } }),
    ]);
    if (emailTaken) return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    if (phoneTaken) return NextResponse.json({ error: "Nomor HP sudah terdaftar." }, { status: 409 });

    const code = await nextEmployeeCode();
    const employee = await prisma.employee.create({
      data: {
        code,
        name,
        email: email.value,
        phone: phone.value,
        level,
        role,
        accessRole: "KARYAWAN",
        homeLat: city.lat,
        homeLng: city.lng,
        homePlace: city.place,
        supervisorId,
      },
    });

    return NextResponse.json({ ok: true, code: employee.code });
  } catch (e) {
    return apiError(e);
  }
}
