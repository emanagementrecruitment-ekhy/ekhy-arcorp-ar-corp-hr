import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { EMPLOYEE_LEVELS, FIELD_CITIES, type EmployeeLevel } from "@/lib/constants";
import { normalizeIdentifier } from "@/lib/lookup";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["OWNER", "CONSULTANT"]);
    const { id } = await params;
    const body = await req.json().catch(() => null);

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing || existing.accessRole !== "KARYAWAN") {
      return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    }

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const emailRaw = typeof body?.email === "string" ? body.email.trim() : "";
    const phoneRaw = typeof body?.phone === "string" ? body.phone.trim() : "";
    const level = body?.level as EmployeeLevel;
    const role = typeof body?.role === "string" ? body.role.trim() : "";
    const place = typeof body?.place === "string" ? body.place : "";
    const supervisorId = typeof body?.supervisorId === "string" && body.supervisorId ? body.supervisorId : null;
    const channelLink = typeof body?.channelLink === "string" ? body.channelLink.trim() : "";
    const supervisorNote = typeof body?.supervisorNote === "string" ? body.supervisorNote.trim() : "";
    const customRateRaw = Number(body?.customRate);

    if (!name) return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    if (!role) return NextResponse.json({ error: "Peran wajib diisi." }, { status: 400 });
    if (!EMPLOYEE_LEVELS.includes(level)) {
      return NextResponse.json({ error: "Level tidak valid." }, { status: 400 });
    }
    if (level === "MANUAL" && (!Number.isFinite(customRateRaw) || customRateRaw <= 0)) {
      return NextResponse.json({ error: "Nominal manual wajib diisi untuk Pendapatan/VCR Manual Input." }, { status: 400 });
    }

    const email = normalizeIdentifier(emailRaw);
    if (email.kind !== "email" || !email.value.includes(".")) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }
    const phone = normalizeIdentifier(phoneRaw);
    if (phone.kind !== "phone" || phone.value.length < 9) {
      return NextResponse.json({ error: "Nomor HP tidak valid." }, { status: 400 });
    }

    // Employees seeded/added before FIELD_CITIES was last changed can carry a
    // `place` no longer in the preset list — leave their coordinates alone
    // when that legacy value comes back unchanged, only require a match
    // against the current presets when the place is actually being changed.
    const city = FIELD_CITIES.find((c) => c.place === place);
    if (!city && place !== existing.homePlace) {
      return NextResponse.json({ error: "Kota/lokasi kerja tidak valid." }, { status: 400 });
    }

    if (supervisorId === id) {
      return NextResponse.json({ error: "Karyawan tidak bisa menjadi supervisor diri sendiri." }, { status: 400 });
    }
    if (supervisorId) {
      const supervisor = await prisma.employee.findUnique({ where: { id: supervisorId } });
      if (!supervisor || supervisor.accessRole !== "KARYAWAN" || supervisor.role !== "Kepala Mess") {
        return NextResponse.json({ error: "Supervisor harus karyawan berperan Kepala Mess." }, { status: 400 });
      }
    }

    const [emailTaken, phoneTaken] = await Promise.all([
      prisma.employee.findFirst({ where: { email: email.value, id: { not: id } } }),
      prisma.employee.findFirst({ where: { phone: phone.value, id: { not: id } } }),
    ]);
    if (emailTaken) return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    if (phoneTaken) return NextResponse.json({ error: "Nomor HP sudah terdaftar." }, { status: 409 });

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        name,
        email: email.value,
        phone: phone.value,
        level,
        customRate: level === "MANUAL" ? Math.round(customRateRaw) : null,
        role,
        homeLat: city ? city.lat : existing.homeLat,
        homeLng: city ? city.lng : existing.homeLng,
        homePlace: city ? city.place : existing.homePlace,
        supervisorId,
        channelLink: channelLink || null,
        supervisorNote: supervisorNote || null,
      },
    });

    return NextResponse.json({ ok: true, code: updated.code });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["OWNER", "CONSULTANT"]);
    const { id } = await params;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing || existing.accessRole !== "KARYAWAN") {
      return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
    }

    const reportCount = await prisma.employee.count({ where: { supervisorId: id } });

    // Vouchers, kasbon, login history, OTPs, and this employee's own chat
    // thread cascade-delete with them; anywhere they're referenced as a
    // supervisor/decider/sender instead (nullable FKs) is set to null.
    await prisma.employee.delete({ where: { id } });

    return NextResponse.json({ ok: true, code: existing.code, reassignedReports: reportCount });
  } catch (e) {
    return apiError(e);
  }
}
