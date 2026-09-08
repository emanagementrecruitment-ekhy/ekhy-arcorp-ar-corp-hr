import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { OTP_MAX_ATTEMPTS, OTP_TTL_SECONDS } from "./constants";
import {
  emailProviderConfigured,
  smsProviderConfigured,
  whatsappProviderConfigured,
  sendOtpEmail,
  sendOtpSms,
  sendOtpWhatsapp,
} from "./otp-providers";
import type { IdentifierKind } from "./lookup";

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Creates and delivers an OTP for an employee.
 *
 * Real delivery is opt-in and purely env-driven (see src/lib/otp-providers.ts
 * and .env.example): set SMTP_* to send real emails, FONNTE_TOKEN to send
 * over WhatsApp, or TWILIO_* to send real SMS. Email logins always use
 * email; phone logins prefer WhatsApp over SMS when both are configured. If
 * the resolved channel's provider isn't configured, this falls back to
 * logging the code server-side and — outside production — returning it in
 * the API response, so the login flow stays testable end to end without any
 * credentials.
 */
export async function issueOtp(employeeId: string, target: string, kind: IdentifierKind) {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await prisma.otpCode.create({
    data: { employeeId, codeHash, expiresAt },
  });

  const channel =
    kind === "email" ? "email" : whatsappProviderConfigured() ? "whatsapp" : smsProviderConfigured() ? "sms" : null;

  if (channel === "email" && emailProviderConfigured()) {
    try {
      await sendOtpEmail(target, code);
      return { devCode: undefined, delivered: true as const };
    } catch (err) {
      console.error(`[otp] email delivery failed for employee ${employeeId}, falling back to console:`, err);
    }
  } else if (channel === "whatsapp") {
    try {
      await sendOtpWhatsapp(target, code);
      return { devCode: undefined, delivered: true as const };
    } catch (err) {
      console.error(`[otp] whatsapp delivery failed for employee ${employeeId}, falling back to console:`, err);
    }
  } else if (channel === "sms") {
    try {
      await sendOtpSms(target, code);
      return { devCode: undefined, delivered: true as const };
    } catch (err) {
      console.error(`[otp] sms delivery failed for employee ${employeeId}, falling back to console:`, err);
    }
  }

  console.log(`[otp] code for employee ${employeeId}: ${code} (expires ${expiresAt.toISOString()})`);

  return {
    devCode: process.env.NODE_ENV === "production" ? undefined : code,
    delivered: false as const,
  };
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "mismatch" };

export async function verifyOtp(employeeId: string, code: string): Promise<OtpVerifyResult> {
  const otp = await prisma.otpCode.findFirst({
    where: { employeeId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false, reason: "not_found" };
  if (otp.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  const match = await bcrypt.compare(code, otp.codeHash);
  if (!match) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "mismatch" };
  }

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}
