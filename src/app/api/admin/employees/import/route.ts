import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { EMPLOYEE_LEVELS, FIELD_CITIES, FIELD_ROLES, VOUCHER_LABEL, usesVcr, type EmployeeLevel } from "@/lib/constants";
import { normalizeIdentifier } from "@/lib/lookup";
import { getEmployeeLimit } from "@/lib/license";
import { readTabularFile, pickField } from "@/lib/import-file";

const MANAGERS = ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] as const;
const MAX_IMPORT_BYTES = 5_000_000;

const TEMPLATE_HEADERS = [
  "Nama",
  "Email",
  "No HP",
  "Peran",
  "Lokasi",
  "Level Pendapatan",
  "Nominal Manual",
  "Gaji",
  "Usia",
  "Berat (kg)",
  "Tinggi (cm)",
  "Kode Supervisor",
  "Catatan Supervisor",
  "Link Channel",
];

/**
 * Downloads a fill-in-the-blanks template (Excel, with a Panduan/legend
 * sheet) for the bulk Data Karyawan/Data Tera import below — so an admin
 * always knows the exact columns and valid values without guessing.
 */
export async function GET() {
  try {
    await requireSession([...MANAGERS]);

    const exampleTera = [
      "Contoh Nama Tera", "contoh.tera@email.com", "081234567890", "Tera", FIELD_CITIES[0].place,
      "SILVER", "", "", "22", "55", "160", "", "", "",
    ];
    const exampleStaff = [
      "Contoh Nama Staff", "contoh.staff@email.com", "081234567891", "Staff", FIELD_CITIES[0].place,
      "", "", "3000000", "", "", "", "", "", "",
    ];
    const dataSheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, exampleTera, exampleStaff]);

    const panduan = [
      ["Panduan Pengisian — hapus 2 baris contoh di sheet Data sebelum upload"],
      [],
      ["Kolom wajib untuk semua baris: Nama, Email, No HP, Peran, Lokasi"],
      ["Peran = Tera: wajib isi Level Pendapatan. Peran selain Tera: wajib isi Gaji."],
      ["Level Pendapatan = MANUAL: wajib isi Nominal Manual."],
      ["Usia/Berat/Tinggi hanya dipakai untuk Peran Tera, boleh dikosongkan."],
      ["Kode Supervisor/Catatan Supervisor/Link Channel semuanya opsional."],
      [],
      ["Daftar Peran yang valid:"],
      ...FIELD_ROLES.map((r) => [r]),
      [],
      ["Daftar Lokasi yang valid:"],
      ...FIELD_CITIES.map((c) => [c.place]),
      [],
      ["Daftar Level Pendapatan (khusus Peran Tera):"],
      ...EMPLOYEE_LEVELS.map((l) => [`${l} (${VOUCHER_LABEL[l]})`]),
    ];
    const panduanSheet = XLSX.utils.aoa_to_sheet(panduan);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, dataSheet, "Data");
    XLSX.utils.book_append_sheet(workbook, panduanSheet, "Panduan");
    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Template Data Karyawan & Tera.xlsx"`,
      },
    });
  } catch (e) {
    return apiError(e);
  }
}

function resolveLevel(raw: string): EmployeeLevel | null {
  const norm = raw.trim().toUpperCase();
  if ((EMPLOYEE_LEVELS as readonly string[]).includes(norm)) return norm as EmployeeLevel;
  const byLabel = (Object.entries(VOUCHER_LABEL) as [EmployeeLevel, string][]).find(
    ([, label]) => label.toUpperCase() === norm
  );
  return byLabel ? byLabel[0] : null;
}

function resolveRole(raw: string): string | null {
  const norm = raw.trim().toLowerCase();
  return FIELD_ROLES.find((r) => r.toLowerCase() === norm) ?? null;
}

function resolvePlace(raw: string): string | null {
  const norm = raw.trim().toLowerCase();
  return FIELD_CITIES.find((c) => c.place.toLowerCase() === norm)?.place ?? null;
}

function toIntOrNull(raw: string): number | null {
  const n = Number(raw);
  return raw.trim() !== "" && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/**
 * Bulk "Tambah Karyawan" — onboards many Karyawan/Tera in one upload instead
 * of adding them one at a time. Accepts the same three formats as the
 * Pendapatan importer (.xlsx/.xls/.csv/.txt, see readTabularFile), with one
 * row per employee. Bad rows are skipped with a reported reason rather than
 * aborting the whole batch, since a 50-row import shouldn't fail entirely
 * over one typo.
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

    const employeeLimit = await getEmployeeLimit();
    const existingActiveCount = await prisma.employee.count({ where: { accessRole: "KARYAWAN", status: "AKTIF" } });
    let slotsLeft = employeeLimit === null ? Infinity : employeeLimit - existingActiveCount;

    const [existingEmails, existingPhones, existingByCode] = await Promise.all([
      prisma.employee.findMany({ select: { email: true } }),
      prisma.employee.findMany({ select: { phone: true } }),
      prisma.employee.findMany({ select: { id: true, code: true, role: true, accessRole: true } }),
    ]);
    const usedEmails = new Set(existingEmails.map((e) => e.email));
    const usedPhones = new Set(existingPhones.map((e) => e.phone));
    const byCode = new Map(existingByCode.map((e) => [e.code, e]));

    const existingArCodes = await prisma.employee.findMany({ where: { code: { startsWith: "AR-" } }, select: { code: true } });
    let nextArNum =
      existingArCodes.reduce((max, e) => {
        const n = Number(e.code.slice(3));
        return Number.isFinite(n) && n > max ? n : max;
      }, 0) + 1;

    let created = 0;
    let skippedLimit = 0;
    const errors: { row: number; name: string; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header is row 1
      const name = pickField(row, "Nama", "Name");
      const emailRaw = pickField(row, "Email");
      const phoneRaw = pickField(row, "No HP", "HP", "Telepon", "Phone", "WhatsApp");
      const roleRaw = pickField(row, "Peran", "Role");
      const placeRaw = pickField(row, "Lokasi", "Outlet", "Kota");
      const levelRaw = pickField(row, "Level Pendapatan", "Level", "Level VCR");
      const customRateRaw = pickField(row, "Nominal Manual", "Rate Manual", "Custom Rate");
      const salaryRaw = pickField(row, "Gaji", "Salary");
      const ageRaw = pickField(row, "Usia", "Umur");
      const weightRaw = pickField(row, "Berat (kg)", "Berat", "BB");
      const heightRaw = pickField(row, "Tinggi (cm)", "Tinggi", "TB");
      const supervisorCode = pickField(row, "Kode Supervisor", "Supervisor");
      const supervisorNote = pickField(row, "Catatan Supervisor");
      const channelLink = pickField(row, "Link Channel", "Channel");

      if (!name && !emailRaw && !phoneRaw) continue; // blank row

      function fail(msg: string) {
        errors.push({ row: rowNum, name: name || "(tanpa nama)", error: msg });
      }

      if (!name) { fail("Nama wajib diisi."); continue; }
      const role = resolveRole(roleRaw);
      if (!role) { fail(`Peran "${roleRaw}" tidak dikenali.`); continue; }
      const place = resolvePlace(placeRaw);
      if (!place) { fail(`Lokasi "${placeRaw}" tidak dikenali.`); continue; }

      let level: EmployeeLevel | null = null;
      let customRate: number | null = null;
      let salary: number | null = null;
      if (usesVcr(role)) {
        level = resolveLevel(levelRaw);
        if (!level) { fail(`Level Pendapatan "${levelRaw}" tidak dikenali (wajib untuk Peran Tera).`); continue; }
        if (level === "MANUAL") {
          customRate = toIntOrNull(customRateRaw);
          if (!customRate) { fail("Nominal Manual wajib diisi untuk Level Pendapatan MANUAL."); continue; }
        }
      } else {
        salary = toIntOrNull(salaryRaw);
        if (!salary) { fail("Gaji wajib diisi untuk Peran selain Tera."); continue; }
      }

      const email = normalizeIdentifier(emailRaw);
      if (email.kind !== "email" || !email.value.includes(".")) { fail(`Email "${emailRaw}" tidak valid.`); continue; }
      const phone = normalizeIdentifier(phoneRaw);
      if (phone.kind !== "phone" || phone.value.length < 9) { fail(`No HP "${phoneRaw}" tidak valid.`); continue; }
      if (usedEmails.has(email.value)) { fail("Email sudah terdaftar/duplikat di file ini."); continue; }
      if (usedPhones.has(phone.value)) { fail("No HP sudah terdaftar/duplikat di file ini."); continue; }

      let supervisorId: string | null = null;
      if (supervisorCode) {
        const sup = byCode.get(supervisorCode.trim());
        if (!sup || sup.accessRole !== "KARYAWAN" || sup.role !== "Kepala Mess") {
          fail(`Kode Supervisor "${supervisorCode}" tidak ditemukan atau bukan Kepala Mess.`);
          continue;
        }
        supervisorId = sup.id;
      }

      if (slotsLeft <= 0) { skippedLimit++; continue; }

      const ageYears = usesVcr(role) ? toIntOrNull(ageRaw) : null;
      const weightKg = usesVcr(role) ? toIntOrNull(weightRaw) : null;
      const heightCm = usesVcr(role) ? toIntOrNull(heightRaw) : null;
      const city = FIELD_CITIES.find((c) => c.place === place)!;
      const code = `AR-${String(nextArNum++).padStart(2, "0")}`;

      const employee = await prisma.employee.create({
        data: {
          code,
          name,
          email: email.value,
          phone: phone.value,
          level,
          customRate,
          salary,
          ageYears,
          weightKg,
          heightCm,
          role,
          accessRole: "KARYAWAN",
          homeLat: city.lat,
          homeLng: city.lng,
          homePlace: city.place,
          supervisorId,
          channelLink: channelLink || null,
          supervisorNote: supervisorNote || null,
        },
      });

      usedEmails.add(email.value);
      usedPhones.add(phone.value);
      byCode.set(code, { id: employee.id, code, role, accessRole: "KARYAWAN" });
      created++;
      slotsLeft--;
    }

    return NextResponse.json({ ok: true, created, skippedLimit, errors });
  } catch (e) {
    return apiError(e);
  }
}
