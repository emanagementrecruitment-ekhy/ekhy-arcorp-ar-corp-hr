import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES, STAFF_ROLES } from "@/lib/constants";
import { SHEET_BLOCK_CATEGORIES } from "@/lib/payslip-sheet";
import { readTabularFile, pickField } from "@/lib/import-file";
import { rincianTemplate, xlsxResponse } from "@/lib/import-templates";
import { parseAmount, parseDateKey, parseMonthKey } from "@/lib/import-values";

const MAX_IMPORT_BYTES = 5_000_000;

export async function GET() {
  try {
    await requireSession(OFFICE_ROLES);
    return xlsxResponse(rincianTemplate(), "Template Rincian Slip Pay.xlsx");
  } catch (e) {
    return apiError(e);
  }
}

/**
 * Bulk "Tambah Rincian" for Slip Pay (.xlsx/.xls/.csv/.txt): one row per manual PayslipItem. TOTAL VCR and
 * approved Kasbon are computed live from Voucher/Kasbon and must not be imported here. Re-uploading is safe:
 * an identical row (employee, month, date, description, debit, credit) is skipped.
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession(OFFICE_ROLES);
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    if ((file as File).size > MAX_IMPORT_BYTES) return NextResponse.json({ error: "File terlalu besar — maksimal 5 MB." }, { status: 400 });
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const rows = await readTabularFile(buf, (file as File).name || "upload.xlsx");

    const employees = await prisma.employee.findMany({ where: { accessRole: { in: [...STAFF_ROLES] } }, select: { id: true, code: true } });
    const byCode = new Map(employees.map((e) => [e.code.trim().toLowerCase(), e]));

    let created = 0;
    let alreadyExisting = 0;
    const errors: { row: number; name: string; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header is row 1
      const codeRaw = pickField(row, "Kode Karyawan", "Kode", "Code");
      const monthRaw = pickField(row, "Bulan", "Periode", "Month");
      const dateRaw = pickField(row, "Tanggal", "Tgl", "Date");
      const description = pickField(row, "Keterangan", "Rincian", "Deskripsi", "Description").trim();
      const blokRaw = pickField(row, "Blok", "Kategori", "Category").trim();
      const qty = pickField(row, "Qty", "Jumlah Barang").trim();
      const debitRaw = pickField(row, "Debit");
      const creditRaw = pickField(row, "Kredit", "Credit");
      const note = pickField(row, "Catatan", "Note").trim();

      if (!codeRaw && !description && !debitRaw && !creditRaw) continue; // blank row
      const label = codeRaw || "(tanpa kode)";
      const fail = (msg: string) => errors.push({ row: rowNum, name: label, error: msg });

      const employee = byCode.get(codeRaw.trim().toLowerCase());
      if (!employee) { fail(`Kode "${codeRaw}" tidak ditemukan di Data Karyawan/Tera.`); continue; }
      if (!description) { fail("Keterangan wajib diisi."); continue; }

      const dateKey = dateRaw ? parseDateKey(dateRaw) : null;
      if (dateRaw && !dateKey) { fail(`Tanggal "${dateRaw}" tidak valid (format: YYYY-MM-DD).`); continue; }
      const month = monthRaw ? parseMonthKey(monthRaw) : dateKey ? dateKey.slice(0, 7) : null;
      if (!month) { fail(monthRaw ? `Bulan "${monthRaw}" tidak valid (mis. 2026-10 atau Oktober 2026).` : "Isi Bulan atau Tanggal."); continue; }

      const debit = parseAmount(debitRaw) ?? 0;
      const credit = parseAmount(creditRaw) ?? 0;
      if (debit <= 0 && credit <= 0) { fail("Isi Debit atau Kredit (angka rupiah)."); continue; }
      if (debit > 0 && credit > 0) { fail("Isi Debit ATAU Kredit, jangan keduanya."); continue; }

      let category: string | null = null;
      if (blokRaw) {
        category = SHEET_BLOCK_CATEGORIES.find((c) => c.toLowerCase() === blokRaw.toLowerCase()) ?? null;
        if (!category) { fail(`Blok "${blokRaw}" tidak dikenali (${SHEET_BLOCK_CATEGORIES.join(", ")}).`); continue; }
      }

      const date = dateKey ? new Date(`${dateKey}T12:00:00+07:00`) : null;
      const duplicate = await prisma.payslipItem.findFirst({
        where: { employeeId: employee.id, month, description, debit, credit, date },
        select: { id: true },
      });
      if (duplicate) { alreadyExisting++; continue; }

      await prisma.payslipItem.create({
        data: { employeeId: employee.id, month, date, description, category, qty: qty || null, debit, credit, note: note || null },
      });
      created++;
    }

    await logAudit(session, "IMPORT_DATA", "Rincian Slip Pay", `${created} baris dibuat, ${alreadyExisting} sudah ada`);
    return NextResponse.json({ ok: true, created, alreadyExisting, errors });
  } catch (e) {
    return apiError(e);
  }
}
