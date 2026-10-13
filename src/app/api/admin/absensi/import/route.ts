import { STAFF_ROLES } from "@/lib/constants";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireSession, apiError } from "@/lib/api-auth";
import { readTabularFile, pickField } from "@/lib/import-file";
import { matchEmployeeByName, parseMatrixSheet } from "@/lib/attendance-matrix";
import { jakartaClock } from "@/lib/assistant-rules";

const MANAGERS = ["OWNER", "CONSULTANT", "MANAGER"] as const;
const MAX_IMPORT_BYTES = 5_000_000;
const TEMPLATE_HEADERS = ["Kode Karyawan", "Nama (opsional)", "Tanggal"];

interface MatrixSheetResult {
  sheet: string;
  label: string;
  people: number;
  created: number;
  alreadyMarked: number;
}

/**
 * Reads the monthly "LAPORAN ABSENSI/VCR" workbook and marks every day with a number as present. Returns null when
 * no sheet looks like that report, so the caller falls back to the plain Kode/Tanggal format. Names in the report
 * are matched to Data Karyawan/Tera by (first) name; people with no present day are never matched or reported.
 */
async function importMatrixWorkbook(buf: Buffer) {
  const workbook = XLSX.read(buf, { type: "buffer" });
  const sheets = workbook.SheetNames.flatMap((name) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, blankrows: false, defval: null });
    const parsed = parseMatrixSheet(name, rows);
    return parsed ? [parsed] : [];
  });
  if (sheets.length === 0) return null;

  const employees = await prisma.employee.findMany({
    where: { accessRole: { in: [...STAFF_ROLES] } },
    select: { id: true, code: true, name: true, status: true },
  });
  const today = jakartaClock(new Date()).dateKey;

  // Every (employee, date) the file marks present, grouped per sheet for the summary.
  const wanted: { employeeId: string; dateKey: string; month: string; sheet: string }[] = [];
  const unmatched = new Map<string, { reason: string; sheets: string[]; row: number }>();
  const peoplePerSheet = new Map<string, number>();
  let skippedFuture = 0;

  for (const sheet of sheets) {
    const mm = String(sheet.month).padStart(2, "0");
    for (const person of sheet.people) {
      if (person.days.length === 0) continue;
      const match = matchEmployeeByName(person.name, employees);
      if (!match.ok) {
        const reason =
          match.reason === "ambiguous"
            ? `nama "${person.name}" cocok dengan lebih dari satu orang (${match.candidates.map((c) => c.code).join(", ")}) — tulis nama lengkapnya di file`
            : `nama "${person.name}" tidak ditemukan di Data Karyawan/Tera`;
        const entry = unmatched.get(person.name) ?? { reason, sheets: [], row: person.row };
        entry.sheets.push(sheet.sheet);
        unmatched.set(person.name, entry);
        continue;
      }
      if (match.employee.status !== "AKTIF") {
        const entry = unmatched.get(person.name) ?? { reason: `${match.employee.name} berstatus Resign — tidak bisa ditandai hadir`, sheets: [], row: person.row };
        entry.sheets.push(sheet.sheet);
        unmatched.set(person.name, entry);
        continue;
      }
      peoplePerSheet.set(sheet.sheet, (peoplePerSheet.get(sheet.sheet) ?? 0) + 1);
      for (const day of person.days) {
        const dateKey = `${sheet.year}-${mm}-${String(day).padStart(2, "0")}`;
        if (dateKey > today) {
          skippedFuture++;
          continue;
        }
        wanted.push({ employeeId: match.employee.id, dateKey, month: `${sheet.year}-${mm}`, sheet: sheet.sheet });
      }
    }
  }

  // Skip what is already recorded, then insert the rest in chunks (falling back to one by one if a race hits the
  // unique constraint, so a duplicate can never fail the whole import).
  const ids = [...new Set(wanted.map((w) => w.employeeId))];
  const months = [...new Set(wanted.map((w) => w.month))];
  const existing = ids.length
    ? await prisma.attendance.findMany({ where: { employeeId: { in: ids }, month: { in: months } }, select: { employeeId: true, dateKey: true } })
    : [];
  const have = new Set(existing.map((e) => `${e.employeeId}|${e.dateKey}`));

  const perSheet = new Map<string, MatrixSheetResult>(
    sheets.map((s) => [s.sheet, { sheet: s.sheet, label: `${String(s.month).padStart(2, "0")}/${s.year}`, people: peoplePerSheet.get(s.sheet) ?? 0, created: 0, alreadyMarked: 0 }]),
  );
  const fresh: typeof wanted = [];
  for (const w of wanted) {
    const key = `${w.employeeId}|${w.dateKey}`;
    if (have.has(key)) {
      perSheet.get(w.sheet)!.alreadyMarked++;
    } else {
      have.add(key);
      fresh.push(w);
    }
  }
  for (let i = 0; i < fresh.length; i += 500) {
    const chunk = fresh.slice(i, i + 500);
    try {
      await prisma.attendance.createMany({ data: chunk.map(({ employeeId, dateKey, month }) => ({ employeeId, dateKey, month, manual: true })) });
      for (const w of chunk) perSheet.get(w.sheet)!.created++;
    } catch {
      for (const w of chunk) {
        try {
          await prisma.attendance.create({ data: { employeeId: w.employeeId, dateKey: w.dateKey, month: w.month, manual: true } });
          perSheet.get(w.sheet)!.created++;
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") perSheet.get(w.sheet)!.alreadyMarked++;
        }
      }
    }
  }

  const results = [...perSheet.values()];
  return {
    created: results.reduce((n, r) => n + r.created, 0),
    alreadyMarked: results.reduce((n, r) => n + r.alreadyMarked, 0),
    skippedFuture,
    sheets: results,
    errors: [...unmatched.entries()].map(([name, u]) => ({ row: u.row, info: name, error: `${u.reason} (sheet ${[...new Set(u.sheets)].join(", ")})` })),
  };
}

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
      [],
      ["Cara kedua — laporan bulanan seperti LAPORAN ABSENSI/VCR BV (tanpa perlu diubah):"],
      ["File Excel dengan satu sheet per bulan; judul sheet memuat bulan dan tahun (mis. LAPORAN ABSENSI BV JULY 2026)."],
      ["Kolom NO, NAMA, ... lalu kolom tanggal 1 sampai 31. Angka di tanggal (0 juga) = hadir; huruf (O, M, P, S, I, titik) dan sel kosong diabaikan."],
      ["Nama dicocokkan ke Data Tera/Karyawan (nama depan saja boleh, mis. SHERLY untuk Sherly Amelia). Sheet yang bukan laporan (DASHBOARD, PANDUAN) dilewati."],
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
    const session = await requireSession([...MANAGERS]);

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

    // The office's own monthly report (one sheet per month, one column per day) is read as-is.
    if (!/\.(csv|txt)$/i.test(filename)) {
      const matrix = await importMatrixWorkbook(buf);
      if (matrix) {
        await logAudit(session, "IMPORT_DATA", "Absensi", `Impor laporan bulanan: ${matrix.created} absen baru dari ${matrix.sheets.length} bulan`);
        return NextResponse.json({ ok: true, format: "laporan-bulanan", ...matrix });
      }
    }

    const rows = await readTabularFile(buf, filename);

    const employees = await prisma.employee.findMany({
      where: { accessRole: { in: [...STAFF_ROLES] } },
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
        await prisma.attendance.create({ data: { employeeId: employee.id, dateKey: dateRaw, month: dateRaw.slice(0, 7), manual: true } });
        created++;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          alreadyMarked++;
        } else {
          fail("Gagal menyimpan (error sistem).");
        }
      }
    }

    await logAudit(session, "IMPORT_DATA", "Absensi", "Impor file absensi");
    return NextResponse.json({ ok: true, created, alreadyMarked, errors });
  } catch (e) {
    return apiError(e);
  }
}
