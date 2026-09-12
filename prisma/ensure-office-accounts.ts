import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { HQ } from "../src/lib/constants";

const prisma = new PrismaClient();

// Runs on every production start (see package.json "start:railway"). The
// placeholder office accounts (Owner/Admin Pusat/Kepala Mess) that used to
// be auto-created here are retired — Consultant now holds full
// Owner-equivalent access (see OFFICE_ROLES in src/lib/constants.ts) and is
// the only account this app bootstraps on its own; any other office-tier
// login is created deliberately, for a real person, through the admin
// panel. The Consultant seat is pinned to a specific real person's login
// rather than a placeholder email, so it's upserted by `code` and kept in
// sync on every start — even if an older row from a previous deploy still
// exists under that same code.
const CONSULTANT_ACCOUNT = {
  code: "HQ-CONSULT",
  name: "Consultant",
  role: "Consultant DEAR Management",
  accessRole: "CONSULTANT",
  email: "aldhilarizky@gmail.com",
  phone: "087843860999",
};

async function main() {
  await prisma.employee.upsert({
    where: { code: CONSULTANT_ACCOUNT.code },
    update: { name: CONSULTANT_ACCOUNT.name, email: CONSULTANT_ACCOUNT.email, phone: CONSULTANT_ACCOUNT.phone },
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
