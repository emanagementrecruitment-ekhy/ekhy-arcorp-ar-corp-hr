import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { requireSession, apiError } from "@/lib/api-auth";

const MANAGERS = ["OWNER", "CONSULTANT"] as const; // Owner only — the whole business's data in one file

// Lets Owner/Consultant download the raw SQLite database file — every
// employee, voucher, kasbon, payslip item, and app setting lives in this
// one file, so this is the whole business's data in one download. Only
// these two roles can reach it (same tier that can already see/export all
// of this through the admin panel anyway).
export async function GET() {
  try {
    const session = await requireSession([...MANAGERS]);

    const url = process.env.DATABASE_URL ?? "";
    const filePath = url.startsWith("file:") ? url.slice(5) : url;
    if (!filePath) {
      return NextResponse.json({ error: "DATABASE_URL tidak ditemukan." }, { status: 500 });
    }
    // Prisma resolves a relative sqlite file: URL against the directory
    // containing schema.prisma (./prisma), not the process's cwd — matters
    // for local dev (DATABASE_URL="file:./dev.db"); production's absolute
    // path (file:/data/prod.db) bypasses this entirely via isAbsolute.
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), "prisma", filePath);
    const data = await readFile(absolute);

    await logAudit(session, "BACKUP_DOWNLOAD", "Database", `${Math.round(data.byteLength / 1024)} KB`);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(data, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="arcorp-backup-${stamp}.db"`,
        "Content-Length": String(data.byteLength),
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
