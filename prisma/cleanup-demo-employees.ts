import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KEEP_CODE = "HQ-CONSULT";
const SETTING_ID = "singleton";

// True one-time production cleanup, guarded by AppSetting.demoCleanupAt so it
// actually only ever fires once no matter how many deploys/restarts follow
// (see package.json "start:railway", which runs this on every start).
//
// Before this guard existed, the deleteMany below ran unconditionally on
// EVERY start — the comment called it "one-time" and "a safe no-op forever
// after", but nothing in the code enforced that: any real employee added
// through the admin panel between one deploy and the next would have been
// silently wiped, right alongside the demo data it was meant to purge. The
// guard is what actually makes the "safe no-op forever after" claim true.
async function main() {
  const setting = await prisma.appSetting.findUnique({ where: { id: SETTING_ID } });
  if (setting?.demoCleanupAt) {
    console.log(`[cleanup-demo-employees] already ran at ${setting.demoCleanupAt.toISOString()} — skipping.`);
    return;
  }

  // Clear self-referential (supervisorId) and cross-employee (Kasbon.decidedById)
  // foreign keys first so the bulk delete below can never trip a constraint
  // regardless of row order.
  await prisma.employee.updateMany({ data: { supervisorId: null } });
  await prisma.kasbon.updateMany({ data: { decidedById: null } });

  const { count } = await prisma.employee.deleteMany({ where: { code: { not: KEEP_CODE } } });
  await prisma.notification.deleteMany();

  await prisma.appSetting.upsert({
    where: { id: SETTING_ID },
    update: { demoCleanupAt: new Date() },
    create: { id: SETTING_ID, demoCleanupAt: new Date() },
  });

  console.log(`[cleanup-demo-employees] removed ${count} non-Consultant employee(s) and cleared notifications. Marked done — will not run again.`);
}

main()
  .catch((e) => {
    console.error("[cleanup-demo-employees] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
