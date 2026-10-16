import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { OFFICE_ROLES, FIELD_CITIES, VOUCHER_AMOUNT, usesVcr } from "@/lib/constants";
import { parseMonth, monthRange } from "@/lib/period";
import { buildPayslip, jakartaDay } from "@/lib/payslip";

// The two categories of the TRAVEL / CLASSIC T5 Slip Pay: S = FL, D = CLASSIC_D.
const SD = ["FL", "CLASSIC_D"] as const;
type SdCat = (typeof SD)[number];
const SD_LABEL: Record<SdCat, string> = { FL: "S", CLASSIC_D: "D" };

/**
 * Edits a Tera's S / D vouchers for one month straight from the Slip Pay page:
 *  - edits: set the number of vouchers for a day + category (adds new ones or removes the newest surplus ones)
 *  - rates: change the per-voucher nominal of that category for the whole month
 * Every change is written to the audit log.
 */
export async function PUT(req: Request) {
  try {
    const session = await requireSession(OFFICE_ROLES);
    const body = await req.json().catch(() => null);
    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const month = parseMonth(typeof body?.month === "string" ? body.month : null);
    const edits: Array<{ day: string; category: SdCat; count: number }> = Array.isArray(body?.edits) ? body.edits : [];
    const rates: Partial<Record<SdCat, number>> = body?.rates && typeof body.rates === "object" ? body.rates : {};

    if (!employeeId) return NextResponse.json({ error: "Pilih karyawan dulu." }, { status: 400 });
    if (edits.length > 400) return NextResponse.json({ error: "Terlalu banyak perubahan sekaligus." }, { status: 400 });

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || !usesVcr(employee.role)) return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });

    const { start, end } = monthRange(month);
    const vouchers = await prisma.voucher.findMany({ where: { employeeId, occurredAt: { gte: start, lt: end } }, orderBy: { createdAt: "asc" } });

    // Outlet for newly added vouchers: the employee's own outlet if it is a known location, else TRAVEL.
    const place = (employee.homePlace ?? "").trim();
    const defaultClient = FIELD_CITIES.some((c) => c.place === place) ? place : "TRAVEL";
    const rateOf = (cat: SdCat): number => {
      const typed = Number(rates[cat]);
      if (Number.isFinite(typed) && typed > 0) return Math.round(typed);
      const existing = vouchers.filter((v) => v.category === cat).pop();
      return existing ? existing.amount : VOUCHER_AMOUNT[cat];
    };

    const log: string[] = [];
    const toCreate: Array<{ employeeId: string; category: string; client: string; amount: number; occurredAt: Date }> = [];
    const toDelete: string[] = [];

    for (const e of edits) {
      if (!SD.includes(e?.category) || !/^\d{4}-\d{2}-\d{2}$/.test(String(e?.day)) || !String(e.day).startsWith(month)) {
        return NextResponse.json({ error: "Data perubahan tidak valid." }, { status: 400 });
      }
      const want = Math.round(Number(e.count));
      if (!Number.isFinite(want) || want < 0 || want > 200) return NextResponse.json({ error: "Jumlah VCR tidak valid." }, { status: 400 });
      const mine = vouchers.filter((v) => v.category === e.category && jakartaDay(v.occurredAt) === e.day && !toDelete.includes(v.id));
      if (want === mine.length) continue;
      if (want > mine.length) {
        const client = mine[0]?.client ?? defaultClient;
        const typedRate = Number(rates[e.category]) > 0;
        const amount = typedRate ? rateOf(e.category) : mine[0]?.amount ?? rateOf(e.category);
        for (let i = mine.length; i < want; i++) {
          toCreate.push({ employeeId, category: e.category, client, amount, occurredAt: new Date(`${e.day}T12:00:00+07:00`) });
        }
      } else {
        // remove the newest surplus ones
        for (const v of mine.slice(want)) toDelete.push(v.id);
      }
      log.push(`${e.day} ${SD_LABEL[e.category]}: ${mine.length} → ${want}`);
    }

    const rateChanges: Array<{ cat: SdCat; amount: number }> = [];
    for (const cat of SD) {
      const typed = Math.round(Number(rates[cat]));
      if (!Number.isFinite(typed) || typed <= 0 || typed > 100_000_000) continue;
      if (vouchers.some((v) => v.category === cat && v.amount !== typed)) rateChanges.push({ cat, amount: typed });
    }

    if (toCreate.length === 0 && toDelete.length === 0 && rateChanges.length === 0) {
      return NextResponse.json({ ok: true, unchanged: true, payslip: await buildPayslip(employeeId, month) });
    }

    await prisma.$transaction([
      ...(toDelete.length ? [prisma.voucher.deleteMany({ where: { id: { in: toDelete }, employeeId } })] : []),
      ...(toCreate.length ? [prisma.voucher.createMany({ data: toCreate })] : []),
      ...rateChanges.map((r) =>
        prisma.voucher.updateMany({ where: { employeeId, category: r.cat, occurredAt: { gte: start, lt: end } }, data: { amount: r.amount } }),
      ),
    ]);
    // New vouchers added after a rate change must carry the new rate too.
    for (const r of rateChanges) log.push(`Nominal ${SD_LABEL[r.cat]}: Rp ${r.amount.toLocaleString("id-ID")}`);

    await logAudit(
      session,
      "PAYSLIP_EDIT",
      `${employee.name} (${employee.code}) · ${month}`,
      `Edit VCR Slip Pay (+${toCreate.length} / -${toDelete.length}): ${log.slice(0, 12).join("; ")}${log.length > 12 ? " …" : ""}`,
    );

    return NextResponse.json({ ok: true, payslip: await buildPayslip(employeeId, month) });
  } catch (e) {
    return apiError(e);
  }
}