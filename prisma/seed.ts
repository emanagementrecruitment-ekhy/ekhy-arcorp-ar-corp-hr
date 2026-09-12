import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Demo data (fictional field employees, sample vouchers/attendance, and the
// placeholder office accounts) has been retired — this app now bootstraps
// only the real, pinned Consultant account (see prisma/ensure-office-accounts.ts,
// which always runs on start regardless of this script). This file stays
// as a harmless no-op so `npm run db:seed` / `prisma migrate reset` keep
// working without resurrecting fake data.
async function main() {
  console.log("[seed] Demo data has been retired — nothing to seed. See prisma/ensure-office-accounts.ts.");
}

main()
  .catch((e) => {
    console.error("[seed] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
