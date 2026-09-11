import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { FIELD_CITIES, HQ, type EmployeeLevel } from "@/lib/constants";

const MANAGERS = ["OWNER", "CONSULTANT", "ADMIN_PUSAT"] as const;

const MONTHS: Record<string, number> = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};

function slug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "");
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
      return NextResponse.json({ error: "File Excel tidak ditemukan." }, { status: 400 });
    }

    const buf = Buffer.from(await (file as File).arrayBuffer());
    const workbook = XLSX.read(buf, { type: "buffer" });

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

    const existingPrCodes = await prisma.employee.findMany({
      where: { code: { startsWith: "PR-" } },
      select: { code: true },
    });
    let nextPrNum =
      existingPrCodes.reduce((max, e) => {
        const n = Number(e.code.slice(3));
        return Number.isFinite(n) && n > max ? n : max;
      }, 0) + 1;

    let sheetsProcessed = 0;
    let employeesCreated = 0;
    let vouchersInserted = 0;
    let totalAmount = 0;
    const skippedSheets: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const m = sheetName.trim().match(/^([A-Za-zÀ-ÿ]+)\s+(\d{4})$/);
      const monthIdx = m ? MONTHS[m[1].toLowerCase()] : undefined;
      if (!m || monthIdx === undefined) {
        skippedSheets.push(sheetName);
        continue;
      }
      const year = Number(m[2]);
      const monthLabel = `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${year}`;
      const occurredAt = new Date(Date.UTC(year, monthIdx + 1, 0, 12, 0, 0));

      const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(workbook.Sheets[sheetName], {
        header: 1,
        blankrows: false,
      });

      let sheetHadData = false;

      for (const row of rows.slice(1)) {
        const [, nameRaw, outletRaw, vcrRaw, totalRaw] = row;
        const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
        if (!name || name.toUpperCase() === "TOTAL") continue;
        const vcr = Number(vcrRaw);
        const total = Number(totalRaw);
        if (!Number.isFinite(vcr) || vcr <= 0 || !Number.isFinite(total) || total <= 0) continue;

        sheetHadData = true;
        const outlet = typeof outletRaw === "string" ? outletRaw.trim() : "LAINNYA";
        const perVoucher = Math.round(total / vcr);
        const level: EmployeeLevel = outlet === "HRV" ? "PLATINUM" : "SILVER";

        const key = `${name.toLowerCase()}|${outlet.toLowerCase()}`;
        let employeeId = byNameOutlet.get(key);
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
      }

      if (sheetHadData) sheetsProcessed++;
      else skippedSheets.push(sheetName);
    }

    return NextResponse.json({
      ok: true,
      sheetsProcessed,
      employeesCreated,
      vouchersInserted,
      totalAmount,
      skippedSheets,
    });
  } catch (e) {
    return apiError(e);
  }
}
