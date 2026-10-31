import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { requireSession, apiError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { encryptBackup, passphraseProblem } from "@/lib/backup-crypto";

const MANAGERS = ["OWNER", "CONSULTANT"] as const; // Owner only — the whole business's data in one file

/** Absolute path of the SQLite file (a relative file: URL is resolved against ./prisma, like Prisma does). */
function databasePath(): string | null {
  const url = process.env.DATABASE_URL ?? "";
  const filePath = url.startsWith("file:") ? url.slice(5) : url;
  if (!filePath) return null;
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), "prisma", filePath);
}

/**
 * A consistent copy of the database. The app runs SQLite in WAL mode, so the newest writes may still sit in the -wal
 * file and a plain copy of the main file could miss them; VACUUM INTO writes one complete, consistent file. The plain
 * copy only remains as a fallback, and the temporary file is removed right away.
 */
async function snapshot(absolute: string): Promise<Buffer> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "arbk-"));
  try {
    const out = path.join(dir, "snapshot.db");
    await prisma.$executeRawUnsafe(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
    return await readFile(out);
  } catch (e) {
    console.error("[backup] consistent snapshot failed, using the file copy:", e instanceof Error ? e.message : e);
    return await readFile(absolute);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// Downloads the whole database — every employee, voucher, kasbon, payslip item and setting — as ONE file that is
// encrypted with a passphrase the Owner types here. The passphrase travels in the POST body only (never in a URL or a
// log), is used once and is not stored anywhere. Only Owner/Consultant can reach it.
export async function POST(req: Request) {
  try {
    const session = await requireSession([...MANAGERS]);
    const body = (await req.json().catch(() => null)) as { passphrase?: unknown } | null;
    const problem = passphraseProblem(body?.passphrase);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    if (!rateLimit(`backup:${session.employeeId}`, 5, 60 * 60_000)) {
      return NextResponse.json({ error: "Terlalu sering mengunduh backup. Coba lagi nanti." }, { status: 429 });
    }

    const absolute = databasePath();
    if (!absolute) return NextResponse.json({ error: "DATABASE_URL tidak ditemukan." }, { status: 500 });

    const plain = await snapshot(absolute);
    const encrypted = encryptBackup(plain, body!.passphrase as string);

    await logAudit(session, "BACKUP_DOWNLOAD", "Database", `${Math.round(encrypted.byteLength / 1024)} KB (terenkripsi)`);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(encrypted), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="arcorp-backup-${stamp}.db.enc"`,
        "Content-Length": String(encrypted.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}

// The old plain download is gone: a bookmark or an old page now gets a clear message instead of an unprotected file.
export async function GET() {
  return NextResponse.json({ error: "Backup kini terenkripsi. Unduh dari Pusat Sistem dan masukkan kata sandi Anda." }, { status: 410 });
}
