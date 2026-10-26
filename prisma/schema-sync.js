// Runs after migrate-safe on every start. If the DB still differs from
// schema.prisma (e.g. a migration that was marked "applied" after a partial
// failure on an older DB), apply ONLY the additive difference: new columns,
// new tables, new indexes and Prisma's table-redefine (copy) pattern.
// Anything destructive (DROP COLUMN, dropping a table that is not being
// redefined) is logged and skipped. A backup copy of the DB file is taken
// first. This script never blocks startup.
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");

const url = process.env.DATABASE_URL || "";
const prisma = (args, input) =>
  spawnSync("npx", ["prisma", ...args], { encoding: "utf8", input, maxBuffer: 64 * 1024 * 1024 });

function diff() {
  const r = prisma(["migrate", "diff", "--from-url", url, "--to-schema-datamodel", "prisma/schema.prisma", "--script"]);
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || "migrate diff failed");
  return r.stdout.trim();
}

function isSafe(sql) {
  if (/DROP\s+COLUMN/i.test(sql)) return false;
  const drops = [...sql.matchAll(/DROP\s+TABLE\s+"([^"]+)"/gi)].map((m) => m[1]);
  return drops.every((t) => new RegExp(`CREATE\\s+TABLE\\s+"new_${t}"`, "i").test(sql));
}

try {
  if (!url.startsWith("file:")) {
    console.log("[schema-sync] not a SQLite file DB — skipping.");
    process.exit(0);
  }
  const sql = diff();
  if (!sql || /^--\s*This is an empty migration\.?$/im.test(sql) && !/(ALTER|CREATE|DROP)\s/i.test(sql)) {
    console.log("[schema-sync] DB matches schema.");
    process.exit(0);
  }
  console.log("[schema-sync] DB differs from schema:\n" + sql);
  if (!isSafe(sql)) {
    console.error("[schema-sync] difference includes destructive statements — NOT applying. Fix manually.");
    process.exit(0);
  }
  const file = url.replace(/^file:/, "").split("?")[0];
  try {
    const bak = `${file}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    fs.copyFileSync(file, bak);
    console.log(`[schema-sync] backup saved: ${bak}`);
  } catch (e) {
    console.error("[schema-sync] backup failed — NOT applying:", e.message);
    process.exit(0);
  }
  const r = prisma(["db", "execute", "--url", url, "--stdin"], sql);
  if (r.status !== 0) {
    console.error("[schema-sync] apply failed:", r.stderr || r.stdout);
    process.exit(0);
  }
  const left = diff();
  console.log(/(ALTER|CREATE|DROP)\s/i.test(left) ? "[schema-sync] applied, but a difference remains:\n" + left : "[schema-sync] applied — DB now matches schema.");
} catch (e) {
  console.error("[schema-sync] failed (continuing startup):", e.message || e);
}
process.exit(0);
