import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import pkg from "../../../../../package.json";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { licensingConfigured, getEmployeeLimit } from "@/lib/license";
import { parseChangelog } from "@/lib/changelog";
import { SETTING_ID } from "@/lib/settings";

const MANAGERS = ["OWNER", "CONSULTANT", "MANAGER"];

const SUPPORT_PHONE_DISPLAY = "0881-02545-8888";
const SUPPORT_WA = "62881025458888";

async function dbFileSizeKb(): Promise<number | null> {
  try {
    const url = process.env.DATABASE_URL ?? "";
    const filePath = url.startsWith("file:") ? url.slice(5) : url;
    if (!filePath) return null;
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), "prisma", filePath);
    return Math.round((await stat(absolute)).size / 1024);
  } catch {
    return null;
  }
}

/** Pusat Sistem data: product/license info, live system health, and the latest changelog entries. */
export async function GET() {
  try {
    const session = await requireSession(OFFICE_ROLES);
    const isManager = MANAGERS.includes(session.accessRole);

    const t0 = Date.now();
    let dbOk = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbOk = false;
    }
    const dbMs = Date.now() - t0;

    const [employeeLimit, employeeCount, setting, lastBackup, changelogText, dbKb] = await Promise.all([
      getEmployeeLimit(),
      prisma.employee.count({ where: { accessRole: "KARYAWAN", status: "AKTIF" } }),
      prisma.appSetting.findUnique({ where: { id: SETTING_ID }, select: { ownerGeneratedAt: true } }),
      isManager ? prisma.auditLog.findFirst({ where: { action: "BACKUP_DOWNLOAD" }, orderBy: { at: "desc" }, select: { at: true, actorName: true } }) : Promise.resolve(null),
      readFile(path.join(process.cwd(), "docs", "CHANGELOG.md"), "utf8").catch(() => ""),
      dbFileSizeKb(),
    ]);

    const configured = licensingConfigured();
    const clientId = process.env.CLIENT_ID ?? "";

    return NextResponse.json({
      product: { name: "AR Corp E-Management", version: pkg.version, owner: "AR Corporation", year: new Date().getFullYear() },
      license: {
        configured,
        // Licensed deployments report the vendor-issued package; the reference instance has no cap.
        status: configured ? "AKTIF" : "REFERENSI",
        clientId: clientId ? `${clientId.slice(0, 4)}•••${clientId.slice(-3)}` : null,
        employeeLimit,
        employeeCount,
        ownerGenerated: Boolean(setting?.ownerGeneratedAt),
      },
      support: { phone: SUPPORT_PHONE_DISPLAY, whatsapp: `https://wa.me/${SUPPORT_WA}` },
      system: {
        server: true,
        uptimeMin: Math.floor(process.uptime() / 60),
        database: { ok: dbOk, ms: dbMs, sizeKb: dbKb },
        otp: {
          email: Boolean(process.env.BREVO_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER)),
          whatsapp: Boolean(process.env.FONNTE_TOKEN),
        },
        lastBackup: lastBackup ? { at: lastBackup.at, by: lastBackup.actorName } : null,
        canBackup: isManager,
        now: new Date().toISOString(),
      },
      changelog: parseChangelog(changelogText, 12),
      viewer: { role: session.accessRole, canSeeAudit: isManager },
    });
  } catch (e) {
    return apiError(e);
  }
}
