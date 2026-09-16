import { requireSession, apiError } from "@/lib/api-auth";
import { parseMonth } from "@/lib/period";
import { buildPayslip, ensureRecurringCosts } from "@/lib/payslip";
import { generatePayslipPdf, payslipFilename } from "@/lib/payslip-pdf";

export async function GET(req: Request) {
  try {
    const session = await requireSession(["KARYAWAN", "SUPERVISOR"]);
    const { searchParams } = new URL(req.url);
    const month = parseMonth(searchParams.get("month"));

    await ensureRecurringCosts(session.employeeId, month);
    const payslip = await buildPayslip(session.employeeId, month);
    if (!payslip) return new Response("Data tidak ditemukan.", { status: 404 });

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
