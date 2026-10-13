import { COMPANY_EMAIL, COMPANY_NAME, COMPANY_WEBSITE_HOST, COMPANY_WEBSITE_URL, STAFF_ROLES } from "@/lib/constants";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import pkg from "../../../../../package.json";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { licensingConfigured, getEmployeeLimit } from "@/lib/license";
import { parseChangelog } from "@/lib/changelog";
import { SETTING_ID } from "@/lib/settings";

// Pusat Sistem is Owner-only (CONSULTANT is the vendor tier shown as Owner): Manager/Admin see only the locked page.
const OWNER_ROLES = ["OWNER", "CONSULTANT"] as const;

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
    const session = await requireSession([...OWNER_ROLES]);

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
      prisma.employee.count({ where: { accessRole: { in: [...STAFF_ROLES] }, status: "AKTIF" } }),
      prisma.appSetting.findUnique({ where: { id: SETTING_ID }, select: { ownerGeneratedAt: true } }),
      prisma.auditLog.findFirst({ where: { action: "BACKUP_DOWNLOAD" }, orderBy: { at: "desc" }, select: { at: true, actorName: true } }),
      readFile(path.join(process.cwd(), "docs", "CHANGELOG.md"), "utf8").catch(() => ""),
      dbFileSizeKb(),
    ]);

    const configured = licensingConfigured();
    const clientId = process.env.CLIENT_ID ?? "";

    return NextResponse.json({
      product: { name: "AR Corp E-Management", version: pkg.version, owner: COMPANY_NAME, year: new Date().getFullYear() },
      license: {
        configured,
        // Licensed deployments report the vendor-issued package; the reference instance has no cap.
        status: configured ? "AKTIF" : "REFERENSI",
        clientId: clientId ? `${clientId.slice(0, 4)}•••${clientId.slice(-3)}` : null,
        employeeLimit,
        employeeCount,
        ownerGenerated: Boolean(setting?.ownerGeneratedAt),
      },
      support: {
        phone: SUPPORT_PHONE_DISPLAY,
        whatsapp: `https://wa.me/${SUPPORT_WA}`,
        email: COMPANY_EMAIL,
        website: COMPANY_WEBSITE_URL,
        websiteLabel: COMPANY_WEBSITE_HOST,
      },
      system: {
        server: true,
        uptimeMin: Math.floor(process.uptime() / 60),
        database: { ok: dbOk, ms: dbMs, sizeKb: dbKb },
        otp: {
          email: Boolean(process.env.BREVO_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER)),
          whatsapp: Boolean(process.env.FONNTE_TOKEN),
        },
        lastBackup: lastBackup ? { at: lastBackup.at, by: lastBackup.actorName } : null,
        canBackup: true,
        now: new Date().toISOString(),
      },
      changelog: parseChangelog(changelogText, 12),
      viewer: { role: session.accessRole, canSeeAudit: true },
    });
  } catch (e) {
    return apiError(e);
  }
}
