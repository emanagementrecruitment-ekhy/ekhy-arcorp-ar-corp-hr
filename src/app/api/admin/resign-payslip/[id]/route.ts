import { requireSession, apiError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * Downloads one archived resign Slip Pay PDF, frozen at the moment the
 * employee/Tera was marked RESIGN (see src/lib/payslip-archive.ts).
 * OWNER/CONSULTANT only — same lock as the listing route.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(["OWNER", "CONSULTANT"]);
    const { id } = await params;

    const row = await prisma.resignPayslip.findUnique({ where: { id } });
    if (!row) return new Response("Arsip tidak ditemukan.", { status: 404 });

    return new Response(new Uint8Array(row.pdfData), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
