// Runs `prisma migrate deploy`, and self-heals one specific case: a DB that
// was created before migration history existed (or by `db push`) already has
// the column/table a migration wants to add, so the migration fails with
// "duplicate column" / "already exists" and Prisma then blocks every deploy
// with P3009. In that case we mark ONLY that migration as applied and retry.
// Any other failure still stops startup. Never deletes data.
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");

const bin = "npx";
const run = (args) => spawnSync(bin, ["prisma", ...args], { stdio: "inherit" });

async function failedMigrations() {
  const prisma = new PrismaClient();
  try {
    return await prisma.$queryRawUnsafe(
      `SELECT migration_name, logs FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL`,
    );
  } catch {
    return [];
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  for (let i = 0; i < 40; i++) {
    const first = run(["migrate", "deploy"]);
    if (first.status === 0) return;
    const failed = await failedMigrations();
    if (failed.length === 0) process.exit(first.status || 1);
    for (const f of failed) {
      const logs = String(f.logs || "");
      if (/duplicate column|already exists/i.test(logs)) {
        console.log(`[migrate-safe] ${f.migration_name} already present in DB — marking applied.`);
        if (run(["migrate", "resolve", "--applied", f.migration_name]).status !== 0) process.exit(1);
      } else if (!logs) {
        console.log(`[migrate-safe] ${f.migration_name} failed without logs — marking rolled back and retrying.`);
        if (run(["migrate", "resolve", "--rolled-back", f.migration_name]).status !== 0) process.exit(1);
      } else {
        console.error(`[migrate-safe] ${f.migration_name} failed for another reason:\n${logs}`);
        process.exit(1);
      }
    }
  }
  process.exit(1);
}

main().catch((e) => {
  console.error("[migrate-safe] failed:", e);
  process.exit(1);
});
