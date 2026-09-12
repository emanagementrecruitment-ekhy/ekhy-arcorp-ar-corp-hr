import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// One-time production cleanup, run on every start (see package.json
// "start:railway") so it applies the moment this deploy goes live and is
// a safe no-op forever after: keeps only the Consultant account (full
// Owner-equivalent access — see OFFICE_ROLES in src/lib/constants.ts) and
// permanently deletes every other employee — the seeded demo field staff
// and the retired placeholder office accounts (Owner/Admin Pusat/Kepala
// Mess) alike. Any real office-holder or field employee going forward is
// added deliberately through the admin panel.
const KEEP_CODE = "HQ-CONSULT";

async function main() {
  // Clear self-referential (supervisorId) and cross-employee (Kasbon.decidedById)
  // foreign keys first so the bulk delete below can never trip a constraint
  // regardless of row order.
  await prisma.employee.updateMany({ data: { supervisorId: null } });
  await prisma.kasbon.updateMany({ data: { decidedById: null } });

  const { count } = await prisma.employee.deleteMany({ where: { code: { not: KEEP_CODE } } });
  await prisma.notification.deleteMany();

  console.log(`[cleanup-demo-employees] removed ${count} non-Consultant employee(s) and cleared notifications.`);
}

main()
  .catch((e) => {
    console.error("[cleanup-demo-employees] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
