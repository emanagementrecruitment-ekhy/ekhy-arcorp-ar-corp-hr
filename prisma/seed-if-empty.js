// Runs on every production start (see package.json "start:railway"). Seeds
// demo data only the first time — once any Employee row exists, this is a
// no-op, so a redeploy or restart never wipes real data an Owner/Consultant
// has since added or approved.
//
// Plain CommonJS on purpose: this runs directly via `node`, outside Next's
// build pipeline, before any TypeScript/ESM tooling is available.
/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const { execSync } = require("node:child_process");

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.employee.count();
  if (count > 0) {
    console.log(`[seed-if-empty] ${count} employee(s) already present — skipping seed.`);
    return;
  }
  console.log("[seed-if-empty] No employees found — running prisma/seed.ts once.");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
}

main()
  .catch((e) => {
    console.error("[seed-if-empty] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
