import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { readTabularFile, pickField } from "@/lib/import-file";

const MANAGERS = ["OWNER", "CONSULTANT", "MANAGER"] as const;
const MAX_IMPORT_BYTES = 5_000_000;
const TEMPLATE_HEADERS = ["Kode Karyawan", "Nama (opsional)", "Tanggal"];

/** Fill-in-the-blanks template — same pattern as /api/admin/employees/import. */
export async function GET() {
  try {
    await requireSession([...MANAGERS]);
    const today = new Date().toISOString().slice(0, 10);
    const dataSheet = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      ["AR-01", "Budi Santoso", today],
      ["PR-001", "Sari Amelia", today],
    ]);
    const panduan = [
      ["Panduan Pengisian — hapus 2 baris contoh di sheet Data sebelum upload"],
      [],
      ["Kode Karyawan wajib diisi — lihat kodenya di Data Karyawan/Data Tera."],
      ["Kolom Nama cuma bantu memeriksa, tidak dipakai sistem."],
      ["Tanggal format YYYY-MM-DD (contoh: 2026-09-22), tidak boleh tanggal yang belum terjadi."],
      ["Satu baris = tandai satu karyawan/Tera hadir pada tanggal itu."],
      ["Kalau satu orang hadir di beberapa hari, buat baris terpisah untuk tiap tanggal."],
    ];
    const panduanSheet = XLSX.utils.aoa_to_sheet(panduan);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, dataSheet, "Data");
    XLSX.utils.book_append_sheet(workbook, panduanSheet, "Panduan");
    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Template Absensi Harian.xlsx"`,
      },
    });
  } catch (e) {
    return apiError(e);
  }
}

/**
 * Bulk backfill for Absensi Harian — one row per (karyawan, tanggal) marked
 * present, same three formats as the other importers (.xlsx/.xls/.csv/.txt).
 * Mirrors markAttendanceToday()'s idempotent create-and-catch-P2002 so a
 * duplicate row (or re-uploading the same file) just reports
 * "sudah tercatat" instead of erroring. Never runs the late-checkin penalty
 * check, same reasoning as the manual single-entry route.
 */
export async function POST(req: Request) {
  try {
    await requireSession([...MANAGERS]);

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }
    if ((file as File).size > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: "File terlalu besar — maksimal 5 MB." }, { status: 400 });
    }
    const filename = (file as File).name || "upload.xlsx";
    const buf = Buffer.from(await (file as File).arrayBuffer());
    const rows = await readTabularFile(buf, filename);

    const employees = await prisma.employee.findMany({
      where: { accessRole: "KARYAWAN" },
      select: { id: true, code: true, name: true, status: true },
    });
    const byCode = new Map(employees.map((e) => [e.code.trim().toLowerCase(), e]));
    const byName = new Map(employees.map((e) => [e.name.trim().toLowerCase(), e]));
    const today = new Date().toISOString().slice(0, 10);

    let created = 0;
    let alreadyMarked = 0;
    const errors: { row: number; info: string; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header is row 1
      const codeRaw = pickField(row, "Kode Karyawan", "Kode", "Code");
      const nameRaw = pickField(row, "Nama", "Nama (opsional)", "Name");
      const dateRaw = pickField(row, "Tanggal", "Date", "Tgl").trim();

      if (!codeRaw && !nameRaw && !dateRaw) continue; // blank row
      const info = codeRaw || nameRaw || "(baris tanpa identitas)";

      function fail(msg: string) {
        errors.push({ row: rowNum, info, error: msg });
      }

      const employee =
        (codeRaw && byCode.get(codeRaw.trim().toLowerCase())) || (nameRaw && byName.get(nameRaw.trim().toLowerCase()));
      if (!employee) {
        fail(`Karyawan/Tera "${codeRaw || nameRaw}" tidak ditemukan.`);
        continue;
      }
      if (employee.status !== "AKTIF") {
        fail(`${employee.name} berstatus Resign — tidak bisa ditandai hadir.`);
        continue;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
        fail(`Tanggal "${dateRaw}" tidak valid (format: YYYY-MM-DD).`);
        continue;
      }
      if (dateRaw > today) {
        fail(`Tanggal ${dateRaw} belum terjadi.`);
        continue;
      }

      try {
        await prisma.attendance.create({ data: { employeeId: employee.id, dateKey: dateRaw, month: dateRaw.slice(0, 7) } });
        created++;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          alreadyMarked++;
        } else {
          fail("Gagal menyimpan (error sistem).");
        }
      }
    }

    return NextResponse.json({ ok: true, created, alreadyMarked, errors });
  } catch (e) {
    return apiError(e);
  }
}
