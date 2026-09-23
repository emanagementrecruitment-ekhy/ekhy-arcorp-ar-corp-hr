import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES, EMPLOYEE_LEVELS, FIELD_CITIES, VCR_ROLE, usesVcr, type EmployeeLevel } from "@/lib/constants";
import { shortRp } from "@/lib/format";
import { normalizeIdentifier } from "@/lib/lookup";
import { getEmployeeLimit } from "@/lib/license";
import { parseBirthDate } from "@/lib/birthday";

const PAGE_SIZE = 10;

export async function GET(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    // "tera" -> Data Tera list, "staff" -> Data Karyawan list, omitted -> everyone
    // (used by internal callers like the supervisor picker).
    const type = searchParams.get("type");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    // Internal callers (e.g. the supervisor picker) can ask for a bigger page
    // to get the full roster in one call; capped well above realistic org size.
    const pageSize = Math.min(500, Math.max(1, Number(searchParams.get("pageSize")) || PAGE_SIZE));

    // Phone matching only kicks in for a query that's substantially numeric —
    // a short digit run (e.g. the "05" left over from stripping "AR-05") would
    // otherwise false-match unrelated phone numbers that merely contain it.
    const qDigits = q.replace(/\D/g, "");
    // Defaults to the active roster; ?status=RESIGN switches to the resigned
    // list (see EMPLOYEE_STATUSES) so an admin can review or reactivate them.
    const status = searchParams.get("status") === "RESIGN" ? "RESIGN" : "AKTIF";
    const where = {
      accessRole: "KARYAWAN" as const,
      status,
      ...(type === "tera" ? { role: VCR_ROLE } : type === "staff" ? { role: { not: VCR_ROLE } } : {}),
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
        const vcr = usesVcr(e.role);
        return {
          id: e.id,
          name: e.name,
          code: e.code,
          role: e.role,
          status: e.status,
          level: e.level,
          customRate: e.customRate,
          salary: e.salary,
          ageYears: e.ageYears,
          weightKg: e.weightKg,
          heightCm: e.heightCm,
          email: e.email,
          phone: e.phone,
          place: e.homePlace,
          supervisorId: e.supervisorId ?? "",
          channelLink: e.channelLink ?? "",
          supervisorNote: e.supervisorNote ?? "",
          birthPlace: e.birthPlace,
          birthDate: e.birthDate,
          photoDataUrl: e.photoDataUrl,
          count: vcr ? `${e.vouchers.length} vc` : "—",
          kasbon: kasApproved ? shortRp(kasApproved) : "—",
          total: vcr ? shortRp(e.vouchers.reduce((s, v) => s + v.amount, 0)) : shortRp(e.salary ?? 0),
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
    // Admin can add new field employees; editing/deleting existing ones stays Owner/Consultant/Manager only (see [id]/route.ts).
    await requireSession(["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"]);

    const employeeLimit = await getEmployeeLimit();
    if (employeeLimit !== null) {
      const currentCount = await prisma.employee.count({ where: { accessRole: "KARYAWAN", status: "AKTIF" } });
      if (currentCount >= employeeLimit) {
        return NextResponse.json(
          { error: `Batas paket (${employeeLimit} karyawan/Tera) sudah tercapai. Hubungi vendor untuk upgrade paket.` },
          { status: 403 }
        );
      }
    }

    const body = await req.json().catch(() => null);

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const emailRaw = typeof body?.email === "string" ? body.email.trim() : "";
    const phoneRaw = typeof body?.phone === "string" ? body.phone.trim() : "";
    const level = body?.level as EmployeeLevel;
    const role = typeof body?.role === "string" ? body.role.trim() : "";
    const place = typeof body?.place === "string" ? body.place : "";
    const supervisorId = typeof body?.supervisorId === "string" && body.supervisorId ? body.supervisorId : null;
    const channelLink = typeof body?.channelLink === "string" ? body.channelLink.trim() : "";
    const supervisorNote = typeof body?.supervisorNote === "string" ? body.supervisorNote.trim() : "";
    const birthPlace = typeof body?.birthPlace === "string" ? body.birthPlace.trim() : "";
    const birthDateResult = parseBirthDate(body?.birthDate);
    if (!birthDateResult.ok) return NextResponse.json({ error: birthDateResult.error }, { status: 400 });
    const customRateRaw = Number(body?.customRate);
    const salaryRaw = Number(body?.salary);
    const ageYearsRaw = Number(body?.ageYears);
    const weightKgRaw = Number(body?.weightKg);
    const heightCmRaw = Number(body?.heightCm);

    if (!name) return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    if (!role) return NextResponse.json({ error: "Peran wajib diisi." }, { status: 400 });
    // Only "Tera" earns via Pendapatan/VCR — every other Peran is salaried (Gaji).
    if (usesVcr(role)) {
      if (!EMPLOYEE_LEVELS.includes(level)) {
        return NextResponse.json({ error: "Level tidak valid." }, { status: 400 });
      }
      if (level === "MANUAL" && (!Number.isFinite(customRateRaw) || customRateRaw <= 0)) {
        return NextResponse.json({ error: "Nominal manual wajib diisi untuk Pendapatan/VCR Manual Input." }, { status: 400 });
      }
    } else if (!Number.isFinite(salaryRaw) || salaryRaw <= 0) {
      return NextResponse.json({ error: "Nominal Gaji wajib diisi." }, { status: 400 });
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
      if (!supervisor || supervisor.accessRole !== "KARYAWAN" || supervisor.role !== "Kepala Mess") {
        return NextResponse.json({ error: "Supervisor harus karyawan berperan Kepala Mess." }, { status: 400 });
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
        level: usesVcr(role) ? level : null,
        customRate: usesVcr(role) && level === "MANUAL" ? Math.round(customRateRaw) : null,
        salary: usesVcr(role) ? null : Math.round(salaryRaw),
        ageYears: usesVcr(role) && Number.isFinite(ageYearsRaw) && ageYearsRaw > 0 ? Math.round(ageYearsRaw) : null,
        weightKg: usesVcr(role) && Number.isFinite(weightKgRaw) && weightKgRaw > 0 ? Math.round(weightKgRaw) : null,
        heightCm: usesVcr(role) && Number.isFinite(heightCmRaw) && heightCmRaw > 0 ? Math.round(heightCmRaw) : null,
        role,
        accessRole: "KARYAWAN",
        homeLat: city.lat,
        homeLng: city.lng,
        homePlace: city.place,
        supervisorId,
        channelLink: channelLink || null,
        supervisorNote: supervisorNote || null,
        birthPlace: birthPlace || null,
        birthDate: birthDateResult.value,
      },
    });

    return NextResponse.json({ ok: true, code: employee.code });
  } catch (e) {
    return apiError(e);
  }
}
