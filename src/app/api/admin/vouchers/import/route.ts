import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { FIELD_CITIES, HQ, type EmployeeLevel } from "@/lib/constants";
import { notifyOffice } from "@/lib/notify";
import { fmtRp } from "@/lib/format";
import { getEmployeeLimit } from "@/lib/license";
import { readTabularFile, pickField } from "@/lib/import-file";

const MANAGERS = ["OWNER", "CONSULTANT", "ADMIN_PUSAT", "MANAGER"] as const;
// The xlsx parser has known ReDoS/resource-exhaustion issues on maliciously
// crafted files (GHSA-5pgg-2g8v-p4x9) with no upstream npm fix — this cap
// bounds how much a single import can make the parser chew on, on top of
// the route already being restricted to trusted office-tier accounts.
const MAX_IMPORT_BYTES = 5_000_000;

const MONTHS: Record<string, number> = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};

function slug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "");
}

function parseMonthLabel(raw: string): { monthIdx: number; year: number; label: string } | null {
  const m = raw.trim().match(/^([A-Za-zÀ-ÿ]+)\s+(\d{4})$/);
  const monthIdx = m ? MONTHS[m[1].toLowerCase()] : undefined;
  if (!m || monthIdx === undefined) return null;
  const year = Number(m[2]);
  return { monthIdx, year, label: `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${year}` };
}

/**
 * Monthly VCR outlet reports (see the sheet's own footnote) name staff by
 * first name only and never carry contact info — the recurring workflow is
 * "Admin fills in JUMLAH VCR each month", not "onboard a new login". So a
 * name not yet in the system gets a placeholder email/phone here, flagged
 * for whoever manages Data Karyawan to swap for the real thing later.
 */
async function uniqueEmail(base: string, outlet: string, taken: Set<string>) {
  const b = slug(base) || "staff";
  const candidates = [`${b}@dear.id`, `${b}.${slug(outlet)}@dear.id`];
  for (const c of candidates) {
    if (!taken.has(c)) return c;
  }
  let n = 2;
  while (taken.has(`${b}${n}@dear.id`)) n++;
  return `${b}${n}@dear.id`;
}

async function uniquePhone(taken: Set<string>) {
  let n = 890000001;
  while (taken.has(`08${n}`)) n++;
  return `08${n}`;
}

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

    const [existingEmployees, existingEmails, existingPhones] = await Promise.all([
      prisma.employee.findMany({ where: { accessRole: "KARYAWAN" }, select: { id: true, name: true, homePlace: true } }),
      prisma.employee.findMany({ select: { email: true } }),
      prisma.employee.findMany({ select: { phone: true } }),
    ]);
    // Keyed by name+outlet, not name alone — two different real people can
    // (and in these reports, do) share a first name at different venues.
    const byNameOutlet = new Map(
      existingEmployees.map((e) => [`${e.name.trim().toLowerCase()}|${e.homePlace.trim().toLowerCase()}`, e.id])
    );
    const usedEmails = new Set(existingEmails.map((e) => e.email));
    const usedPhones = new Set(existingPhones.map((e) => e.phone));

    const employeeLimit = await getEmployeeLimit();
    let employeeSlotsLeft = employeeLimit === null ? Infinity : employeeLimit - existingEmployees.length;
    let employeesSkippedLimit = 0;

    const existingPrCodes = await prisma.employee.findMany({
      where: { code: { startsWith: "PR-" } },
      select: { code: true },
    });
    let nextPrNum =
      existingPrCodes.reduce((max, e) => {
        const n = Number(e.code.slice(3));
        return Number.isFinite(n) && n > max ? n : max;
      }, 0) + 1;

    let vouchersInserted = 0;
    let employeesCreated = 0;
    let totalAmount = 0;

    // One shared row handler for both the Excel (one sheet per month) and
    // CSV/txt (one flat table, "Bulan" column per row) shapes below — same
    // name/outlet/vcr/total business logic either way. AR Corp derives each
    // new Tera's starting Grade from the outlet they're reported at (HRV ->
    // Platinum, Classic T2 -> Classic D, everything else -> Silver) rather
    // than a generic fallback, since these are the venue tiers this
    // deployment's own outlets actually use.
    async function processRow(nameRaw: string, outletRaw: string, vcr: number, total: number, monthLabel: string, occurredAt: Date) {
      const name = nameRaw.trim();
      if (!name || name.toUpperCase() === "TOTAL") return false;
      if (!Number.isFinite(vcr) || vcr <= 0 || !Number.isFinite(total) || total <= 0) return false;

      const outlet = outletRaw.trim() || "LAINNYA";
      const perVoucher = Math.round(total / vcr);
      const level: EmployeeLevel =
        outlet === "HRV" ? "PLATINUM" : outlet === "CLASSIC T2" ? "CLASSIC_D" : "SILVER";

      const key = `${name.toLowerCase()}|${outlet.toLowerCase()}`;
      let employeeId = byNameOutlet.get(key);
      if (!employeeId && employeeSlotsLeft <= 0) {
        employeesSkippedLimit++;
        return true;
      }
      if (!employeeId) {
        const email = await uniqueEmail(name, outlet, usedEmails);
        const phone = await uniquePhone(usedPhones);
        usedEmails.add(email);
        usedPhones.add(phone);
        const city = FIELD_CITIES.find((c) => c.place === outlet);
        const code = `PR-${String(nextPrNum++).padStart(3, "0")}`;
        const created = await prisma.employee.create({
          data: {
            code,
            name,
            email,
            phone,
            level,
            role: "Tera",
            accessRole: "KARYAWAN",
            homeLat: city?.lat ?? HQ.lat,
            homeLng: city?.lng ?? HQ.lng,
            homePlace: outlet,
          },
        });
        employeeId = created.id;
        byNameOutlet.set(key, employeeId);
        employeesCreated++;
        employeeSlotsLeft--;
      }

      const client = `Rekap ${outlet} · ${monthLabel}`;
      await prisma.voucher.deleteMany({ where: { employeeId, client } });
      await prisma.voucher.createMany({
        data: Array.from({ length: vcr }, () => ({
          employeeId: employeeId!,
          category: level,
          client,
          amount: perVoucher,
          occurredAt,
        })),
      });
      vouchersInserted += vcr;
      totalAmount += total;
      return true;
    }

    let sheetsProcessed = 0;
    const skippedSheets: string[] = [];
    const lower = filename.toLowerCase();

    if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
      // Flat table, one row per staff/outlet/month — since a plain text file
      // can't carry an Excel-style "one sheet per month" structure, each row
      // names its own month via a "Bulan" column (e.g. "September 2026").
      const rows = await readTabularFile(buf, filename);
      const monthsSeen = new Map<string, { label: string; occurredAt: Date; hadData: boolean }>();

      for (const row of rows) {
        const bulanRaw = pickField(row, "Bulan", "Bulan Tahun", "Periode");
        const parsed = parseMonthLabel(bulanRaw);
        if (!parsed) {
          if (bulanRaw) skippedSheets.push(bulanRaw);
          continue;
        }
        const occurredAt = new Date(Date.UTC(parsed.year, parsed.monthIdx + 1, 0, 12, 0, 0));
        if (!monthsSeen.has(parsed.label)) monthsSeen.set(parsed.label, { label: parsed.label, occurredAt, hadData: false });

        const name = pickField(row, "Nama");
        const outlet = pickField(row, "Outlet", "Lokasi");
        const vcr = Number(pickField(row, "Jumlah VCR", "VCR", "Jml VCR"));
        const total = Number(pickField(row, "Total", "Total Pendapatan"));
        const hadData = await processRow(name, outlet, vcr, total, parsed.label, occurredAt);
        if (hadData) monthsSeen.get(parsed.label)!.hadData = true;
      }
      sheetsProcessed = Array.from(monthsSeen.values()).filter((m) => m.hadData).length;
    } else {
      const workbook = XLSX.read(buf, { type: "buffer" });
      for (const sheetName of workbook.SheetNames) {
        const parsed = parseMonthLabel(sheetName);
        if (!parsed) {
          skippedSheets.push(sheetName);
          continue;
        }
        const occurredAt = new Date(Date.UTC(parsed.year, parsed.monthIdx + 1, 0, 12, 0, 0));
        const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(workbook.Sheets[sheetName], {
          header: 1,
          blankrows: false,
        });

        let sheetHadData = false;
        for (const row of rows.slice(1)) {
          const [, nameRaw, outletRaw, vcrRaw, totalRaw] = row;
          const name = typeof nameRaw === "string" ? nameRaw : "";
          const outlet = typeof outletRaw === "string" ? outletRaw : "";
          const hadData = await processRow(name, outlet, Number(vcrRaw), Number(totalRaw), parsed.label, occurredAt);
          if (hadData) sheetHadData = true;
        }
        if (sheetHadData) sheetsProcessed++;
        else skippedSheets.push(sheetName);
      }
    }

    if (vouchersInserted > 0) {
      await notifyOffice(`Import Pendapatan: ${vouchersInserted} voucher dari ${sheetsProcessed} outlet · ${fmtRp(totalAmount)}`);
    }

    return NextResponse.json({
      ok: true,
      sheetsProcessed,
      employeesCreated,
      employeesSkippedLimit,
      vouchersInserted,
      totalAmount,
      skippedSheets,
    });
  } catch (e) {
    return apiError(e);
  }
}
