import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES } from "@/lib/constants";
import { parseMonth } from "@/lib/period";
import { buildPayslip, ensureAttendancePenalty, ensureRecurringCosts } from "@/lib/payslip";
import { generatePayslipPdf, payslipFilename } from "@/lib/payslip-pdf";

export async function GET(req: Request) {
  try {
    await requireSession(OFFICE_ROLES);
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId") ?? "";
    const month = parseMonth(searchParams.get("month"));

    if (!employeeId) return new Response("Pilih karyawan dulu.", { status: 400 });

    await ensureAttendancePenalty(employeeId, month);
    await ensureRecurringCosts(employeeId, month);
    const payslip = await buildPayslip(employeeId, month);
    if (!payslip) return new Response("Karyawan tidak ditemukan.", { status: 404 });

    const pdf = await generatePayslipPdf(payslip);
    const filename = payslipFilename(payslip);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
