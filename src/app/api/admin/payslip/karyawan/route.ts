import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { OFFICE_ROLES, usesVcr } from "@/lib/constants";
import { parseMonth } from "@/lib/period";
import { buildPayslip, groupKaryawanItems, SLIP_GAJI_CATEGORY, type KaryawanLine } from "@/lib/payslip";

const LINES: Record<KaryawanLine, { label: string; kind: "debit" | "credit" }> = {
  bonus: { label: "Bonus", kind: "debit" },
  tunjangan: { label: "Tunjangan", kind: "debit" },
  feeVcr: { label: "Fee VCR", kind: "debit" },
  feeTransport: { label: "Fee Transport", kind: "debit" },
  kasbon: { label: "Kasbon", kind: "credit" },
  denda: { label: "Denda Absen", kind: "credit" },
  terlambat: { label: "Potongan Terlambat", kind: "credit" },
  lain: { label: "Lain-lain", kind: "credit" },
};

/**
 * Edits the Slip Gaji Karyawan lines directly. Each line is kept as ONE row (category "SlipGaji") holding
 * the difference between the typed total and whatever other rows already count towards that line, so the
 * slip always shows exactly the typed number. A typed total below the other rows' sum is refused.
 */
export async function PUT(req: Request) {
  try {
    const session = await requireSession(OFFICE_ROLES);
    const body = await req.json().catch(() => null);
    const employeeId = typeof body?.employeeId === "string" ? body.employeeId : "";
    const month = parseMonth(typeof body?.month === "string" ? body.month : null);
    const lines = body?.lines && typeof body.lines === "object" ? (body.lines as Record<string, unknown>) : {};
    if (!employeeId) return NextResponse.json({ error: "Pilih karyawan dulu." }, { status: 400 });

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee || usesVcr(employee.role)) return NextResponse.json({ error: "Hanya untuk slip karyawan (bukan Tera)." }, { status: 404 });

    const items = await prisma.payslipItem.findMany({ where: { employeeId, month } });
    const others = groupKaryawanItems(items, true);
    const changes: string[] = [];

    for (const key of Object.keys(LINES) as KaryawanLine[]) {
      if (lines[key] === undefined) continue;
      const want = Math.round(Number(lines[key]));
      if (!Number.isFinite(want) || want < 0 || want > 1_000_000_000) return NextResponse.json({ error: `Nominal ${LINES[key].label} tidak valid.` }, { status: 400 });
      const delta = want - others[key];
      if (delta < 0) {
        return NextResponse.json({ error: `${LINES[key].label}: sudah ada rincian lain sebesar Rp ${others[key].toLocaleString("id-ID")} di baris ini. Ubah atau hapus rincian itu dulu.` }, { status: 400 });
      }
      const existing = items.find((i) => i.category === SLIP_GAJI_CATEGORY && i.description === LINES[key].label);
      const qty = key === "feeVcr" ? `${Math.max(0, Math.round(Number(lines.feeVcrQty)) || 0)} vcr` : null;
      const current = existing ? (LINES[key].kind === "debit" ? existing.debit : existing.credit) : 0;
      if (delta === current && (key !== "feeVcr" || qty === (existing?.qty ?? null) || !existing)) continue;
      if (delta === 0) {
        if (existing) await prisma.payslipItem.delete({ where: { id: existing.id } });
      } else {
        const data = { debit: LINES[key].kind === "debit" ? delta : 0, credit: LINES[key].kind === "credit" ? delta : 0, qty };
        if (existing) await prisma.payslipItem.update({ where: { id: existing.id }, data });
        else await prisma.payslipItem.create({ data: { employeeId, month, description: LINES[key].label, category: SLIP_GAJI_CATEGORY, ...data } });
      }
      changes.push(`${LINES[key].label}: Rp ${want.toLocaleString("id-ID")}`);
    }

    if (changes.length) await logAudit(session, "PAYSLIP_EDIT", `${employee.name} (${employee.code}) · ${month}`, `Edit Slip Gaji: ${changes.join("; ")}`);
    return NextResponse.json({ ok: true, unchanged: changes.length === 0, payslip: await buildPayslip(employeeId, month) });
  } catch (e) {
    return apiError(e);
  }
}