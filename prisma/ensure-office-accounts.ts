import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { HQ } from "../src/lib/constants";

const prisma = new PrismaClient();

// Runs on every production start (see package.json "start:railway"), after
// seed-if-empty. Unlike that script, this one always runs — it upserts by
// email so it's safe against an already-populated database: an existing
// account is left untouched (update: {}), a missing one is created. Use
// this to backfill a newly added office-tier role (like SUPERVISOR) into a
// production database that was seeded before that role existed.
const OFFICE_ACCOUNTS = [
  { code: "HQ-OWNER", name: "Owner AR Corp", role: "Owner AR Corp", accessRole: "OWNER", email: "owner@arcorp.id", phone: "081100000001" },
  { code: "HQ-CONSULT", name: "Consultant AR Corp", role: "Consultant AR Corp", accessRole: "CONSULTANT", email: "consultant@arcorp.id", phone: "081100000002" },
  { code: "HQ-ADMIN", name: "Admin Pusat AR Corp", role: "Admin Pusat AR Corp", accessRole: "ADMIN_PUSAT", email: "admin@arcorp.id", phone: "081100000003" },
  { code: "HQ-MESS", name: "Kepala Mess AR Corp", role: "Kepala Mess", accessRole: "SUPERVISOR", email: "kepalamess@arcorp.id", phone: "081100000004" },
];

async function main() {
  for (const acc of OFFICE_ACCOUNTS) {
    const existing = await prisma.employee.findUnique({ where: { email: acc.email } });
    if (existing) continue;
    await prisma.employee.create({
      data: { ...acc, level: "PLATINUM", homeLat: HQ.lat, homeLng: HQ.lng, homePlace: "Kantor Pusat Jakarta" },
    });
    console.log(`[ensure-office-accounts] created ${acc.email}`);
  }
}

main()
  .catch((e) => {
    console.error("[ensure-office-accounts] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
