import "server-only";
import { prisma } from "./prisma";
import { buildPayslip, ensureRecurringCosts } from "./payslip";
import { generatePayslipPdf, payslipFilename } from "./payslip-pdf";
import { emailProviderConfigured, whatsappProviderConfigured, sendPayslipEmail, sendPayslipWhatsapp } from "./otp-providers";

export type DeliveryStatus = "sent" | "skipped" | "failed";

export interface PayslipDeliveryResult {
  email: DeliveryStatus;
  whatsapp: DeliveryStatus;
}

/**
 * Emails/WhatsApps a Slip Pay PDF to an employee's registered contact —
 * "skipped" means that channel has no provider configured (see
 * otp-providers.ts) or the employee has no email/phone on file, not that
 * sending failed.
 */
export async function deliverPayslip(employeeId: string, month: string): Promise<PayslipDeliveryResult> {
  await ensureRecurringCosts(employeeId, month);
  const [employee, payslip] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId } }),
    buildPayslip(employeeId, month),
  ]);
  if (!employee || !payslip) throw new Error("Karyawan atau Slip Pay tidak ditemukan.");

  const pdf = await generatePayslipPdf(payslip);
  const filename = payslipFilename(payslip);
  const subject = `Slip Pay ${payslip.monthLabel} - AR Corp`;
  const text = `Halo ${payslip.employee.name}, berikut Slip Pay Anda untuk ${payslip.monthLabel}. Dokumen terlampir.`;

  const result: PayslipDeliveryResult = { email: "skipped", whatsapp: "skipped" };

  if (employee.email && emailProviderConfigured()) {
    try {
      await sendPayslipEmail(employee.email, subject, text, pdf, filename);
      result.email = "sent";
    } catch (e) {
      console.error("[payslip-delivery] email failed:", e);
      result.email = "failed";
    }
  }

  if (employee.phone && whatsappProviderConfigured()) {
    try {
      await sendPayslipWhatsapp(employee.phone, text, pdf, filename);
      result.whatsapp = "sent";
    } catch (e) {
      console.error("[payslip-delivery] whatsapp failed:", e);
      result.whatsapp = "failed";
    }
  }

  return result;
}
