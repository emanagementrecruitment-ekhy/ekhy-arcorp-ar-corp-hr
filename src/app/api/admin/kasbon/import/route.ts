import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireSession, apiError } from "@/lib/api-auth";
import { STAFF_ROLES } from "@/lib/constants";
import { readTabularFile, pickField } from "@/lib/import-file";
import { kasbonTemplate, xlsxResponse } from "@/lib/import-templates";
import { parseAmount, parseDateKey, parseKasbonStatus, parseYesNo } from "@/lib/import-values";
import { jakartaClock } from "@/lib/assistant-rules";

// Money records: same tier as the Absensi importer (Admin Pusat only transfers, it does not backfill history).
const MANAGERS = ["OWNER", "CONSULTANT", "MANAGER"] as const;
const MAX_IMPORT_BYTES = 5_000_000;

export async function GET() {
  try {
    await requireSession([...MANAGERS]);
    return xlsxResponse(kasbonTemplate(), "Template Kasbon.xlsx");
  } catch (e) {
    return apiError(e);
  }
}

/**
 * Bulk Kasbon import (.xlsx/.xls/.csv/.txt) — one row per kasbon. The row's date becomes the kasbon's date, which is
 * what decides the Slip Pay month an approved kasbon is deducted from. Status defaults to "menunggu Owner" so a
 * row with no status moves no money until someone approves it in the app. Re-uploading the same file is safe:
 * a kasbon with the same employee, day, amount and reason is skipped.
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession([...MANAGERS]);
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    if ((file as File).size > MAX_IMPORT_BYTES) return NextResponse.json({ error: "File terlalu besar — maksimal 5 MB." }, { status: 400 });
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const rows = await readTabularFile(buf, (file as File).name || "upload.xlsx");

    const employees = await prisma.employee.findMany({ where: { accessRole: { in: [...STAFF_ROLES] } }, select: { id: true, code: true, name: true } });
    const byCode = new Map(employees.map((e) => [e.code.trim().toLowerCase(), e]));
    const today = jakartaClock(new Date()).dateKey;

    let created = 0;
    let alreadyExisting = 0;
    const errors: { row: number; name: string; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header is row 1
      const codeRaw = pickField(row, "Kode Karyawan", "Kode", "Code");
      const nameRaw = pickField(row, "Nama (opsional)", "Nama", "Name");
      const dateRaw = pickField(row, "Tanggal", "Tgl", "Date");
      const amountRaw = pickField(row, "Nominal", "Jumlah", "Amount");
      const reason = pickField(row, "Alasan", "Keterangan", "Reason").trim();
      const statusRaw = pickField(row, "Status");
      const transferredRaw = pickField(row, "Sudah Ditransfer", "Ditransfer", "Transfer");

      if (!codeRaw && !nameRaw && !dateRaw && !amountRaw) continue; // blank row
      const label = codeRaw || nameRaw || "(tanpa kode)";
      const fail = (msg: string) => errors.push({ row: rowNum, name: label, error: msg });

      const employee = byCode.get(codeRaw.trim().toLowerCase());
      if (!employee) { fail(`Kode "${codeRaw}" tidak ditemukan di Data Karyawan/Tera.`); continue; }
      const dateKey = parseDateKey(dateRaw);
      if (!dateKey) { fail(`Tanggal "${dateRaw}" tidak valid (format: YYYY-MM-DD).`); continue; }
      if (dateKey > today) { fail(`Tanggal ${dateKey} belum terjadi.`); continue; }
      const amount = parseAmount(amountRaw);
      if (!amount) { fail(`Nominal "${amountRaw}" tidak valid.`); continue; }
      if (!reason) { fail("Alasan wajib diisi."); continue; }
      const status = parseKasbonStatus(statusRaw);
      if (!status) { fail(`Status "${statusRaw}" tidak dikenali (pakai MENUNGGU, DISETUJUI, atau DITOLAK).`); continue; }

      const at = new Date(`${dateKey}T12:00:00+07:00`);
      const dayStart = new Date(`${dateKey}T00:00:00+07:00`);
      const dayEnd = new Date(`${dateKey}T23:59:59.999+07:00`);
      const duplicate = await prisma.kasbon.findFirst({
        where: { employeeId: employee.id, amount, reason, createdAt: { gte: dayStart, lte: dayEnd } },
        select: { id: true },
      });
      if (duplicate) { alreadyExisting++; continue; }

      const decided = status !== "MENUNGGU_OWNER";
      await prisma.kasbon.create({
        data: {
          employeeId: employee.id,
          amount,
          reason,
          status,
          createdAt: at,
          decidedAt: decided ? at : null,
          note: `Diimpor dari file oleh ${session.name}`,
          transferredAt: status === "DISETUJUI" && parseYesNo(transferredRaw) ? at : null,
          transferredByName: status === "DISETUJUI" && parseYesNo(transferredRaw) ? "Impor file" : null,
        },
      });
      created++;
    }

    await logAudit(session, "IMPORT_DATA", "Kasbon", `${created} kasbon dibuat, ${alreadyExisting} sudah ada`);
    return NextResponse.json({ ok: true, created, alreadyExisting, errors });
  } catch (e) {
    return apiError(e);
  }
}
