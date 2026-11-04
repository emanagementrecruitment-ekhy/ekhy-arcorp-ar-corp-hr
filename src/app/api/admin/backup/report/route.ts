import { requireSession, apiError } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { buildBackupPdf } from "@/lib/backup-report";
import { passphraseProblem } from "@/lib/backup-crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { STAFF_ROLES } from "@/lib/constants";

const MANAGERS = ["OWNER", "CONSULTANT"] as const; // Owner only, same as the encrypted database backup

// Readable backup for the Owner: spreadsheet tables in a password-locked PDF (Excel file attached inside it).
// Active and resigned Karyawan/Terapis are listed separately. The passphrase travels in the POST body only and is not stored.
export async function POST(req: Request) {
  try {
    const session = await requireSession([...MANAGERS]);
    const body = (await req.json().catch(() => null)) as { passphrase?: unknown } | null;
    const problem = passphraseProblem(body?.passphrase);
    if (problem) return Response.json({ error: problem }, { status: 400 });
    if (!rateLimit(`backup-report:${session.employeeId}`, 5, 60 * 60_000)) {
      return Response.json({ error: "Terlalu sering mengunduh backup. Coba lagi nanti." }, { status: 429 });
    }

    const rows = await prisma.employee.findMany({
      where: { accessRole: { in: [...STAFF_ROLES] } },
      orderBy: [{ status: "asc" }, { code: "asc" }],
      select: { code: true, name: true, role: true, status: true, email: true, phone: true, homePlace: true, joinedAt: true },
    });
    const pdf = await buildBackupPdf(
      rows.map((r) => ({ code: r.code, name: r.name, role: r.role, status: r.status, email: r.email, phone: r.phone, place: r.homePlace, joinedAt: r.joinedAt })),
      body!.passphrase as string,
      session.name ?? "Owner"
    );
    await logAudit(session, "BACKUP_DOWNLOAD", "Data karyawan (PDF + Excel)", `${rows.length} orang`);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="backup-data-${stamp}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
