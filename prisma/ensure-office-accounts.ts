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
  { code: "HQ-ADMIN", name: "Admin Pusat AR Corp", role: "Admin Pusat AR Corp", accessRole: "ADMIN_PUSAT", email: "admin@arcorp.id", phone: "081100000003" },
  { code: "HQ-MESS", name: "Kepala Mess AR Corp", role: "Kepala Mess", accessRole: "SUPERVISOR", email: "kepalamess@arcorp.id", phone: "081100000004" },
];

// The Consultant seat is pinned to a specific real person's login (full
// Owner-equivalent access — see OFFICE_ROLES in src/lib/constants.ts) rather
// than the seed's placeholder email, so it's upserted by `code` and kept in
// sync on every start — even if an older consultant@arcorp.id row from a
// previous deploy still exists under that same code.
const CONSULTANT_ACCOUNT = {
  code: "HQ-CONSULT",
  name: "Consultant",
  role: "Consultant AR Corp",
  accessRole: "CONSULTANT",
  email: "aldhilarizky@gmail.com",
  phone: "081100000002",
};

async function main() {
  for (const acc of OFFICE_ACCOUNTS) {
    const existing = await prisma.employee.findUnique({ where: { email: acc.email } });
    if (existing) continue;
    await prisma.employee.create({
      data: { ...acc, level: "PLATINUM", homeLat: HQ.lat, homeLng: HQ.lng, homePlace: "Kantor Pusat Jakarta" },
    });
    console.log(`[ensure-office-accounts] created ${acc.email}`);
  }

  await prisma.employee.upsert({
    where: { code: CONSULTANT_ACCOUNT.code },
    update: { name: CONSULTANT_ACCOUNT.name, email: CONSULTANT_ACCOUNT.email },
    create: { ...CONSULTANT_ACCOUNT, level: "PLATINUM", homeLat: HQ.lat, homeLng: HQ.lng, homePlace: "Kantor Pusat Jakarta" },
  });
  console.log(`[ensure-office-accounts] consultant pinned to ${CONSULTANT_ACCOUNT.email}`);
}

main()
  .catch((e) => {
    console.error("[ensure-office-accounts] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
