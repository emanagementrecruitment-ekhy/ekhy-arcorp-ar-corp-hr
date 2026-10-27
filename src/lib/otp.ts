import "server-only";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
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
import { matchOtp, mayLogOtpCode } from "./otp-match";
import type { IdentifierKind } from "./lookup";

function generateCode(): string {
  return String(randomInt(100000, 1000000));
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
 *
 * alwaysReturnCode overrides that production gating for a specific account
 * whose email/phone aren't real (see DEMO_TERA_CODE) — otherwise no one
 * could ever retrieve its code at all.
 */
export async function issueOtp(employeeId: string, target: string, kind: IdentifierKind, alwaysReturnCode = false, purpose = "LOGIN") {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

  await prisma.otpCode.create({
    data: { employeeId, codeHash, expiresAt, purpose },
  });

  const channel =
    kind === "email" ? "email" : whatsappProviderConfigured() ? "whatsapp" : smsProviderConfigured() ? "sms" : null;

  // alwaysReturnCode's target is never a real inbox/number, so "delivered"
  // here would only mean a mail/API server accepted the handoff — never
  // that anyone could actually read it. Show the code regardless of outcome.
  if (channel === "email" && emailProviderConfigured()) {
    try {
      await sendOtpEmail(target, code, purpose === "OWNER_CONFIRM" ? "owner-confirm" : "login");
      return { devCode: alwaysReturnCode ? code : undefined, delivered: true as const };
    } catch (err) {
      console.error(`[otp] email delivery failed for employee ${employeeId}, falling back to console:`, err);
    }
  } else if (channel === "whatsapp") {
    try {
      await sendOtpWhatsapp(target, code);
      return { devCode: alwaysReturnCode ? code : undefined, delivered: true as const };
    } catch (err) {
      console.error(`[otp] whatsapp delivery failed for employee ${employeeId}, falling back to console:`, err);
    }
  } else if (channel === "sms") {
    try {
      await sendOtpSms(target, code);
      return { devCode: alwaysReturnCode ? code : undefined, delivered: true as const };
    } catch (err) {
      console.error(`[otp] sms delivery failed for employee ${employeeId}, falling back to console:`, err);
    }
  }

  if (mayLogOtpCode(process.env)) {
    console.log(`[otp] code for employee ${employeeId}: ${code} (expires ${expiresAt.toISOString()})`);
  } else {
    console.error(`[otp] code for employee ${employeeId} could NOT be delivered (no working ${channel ?? "channel"} provider) — set BREVO_API_KEY or SMTP_*.`);
  }

  // ARCORP_LOCAL_MODE: the AR Corp Desktop app's offline fallback server
  // (see desktop/server-wrapper.js) — there's no internet there to deliver a
  // real code through any channel, so the on-screen fallback is the only way
  // to log in at all while offline.
  const showCode = alwaysReturnCode || process.env.NODE_ENV !== "production" || process.env.ARCORP_LOCAL_MODE === "1";
  return {
    devCode: showCode ? code : undefined,
    delivered: false as const,
  };
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "mismatch" };

export async function verifyOtp(employeeId: string, code: string, purpose = "LOGIN"): Promise<OtpVerifyResult> {
  // Newest few only: a double-tapped "send code" leaves two live codes, and
  // either email's code must work (see matchOtp).
  const candidates = await prisma.otpCode.findMany({
    where: { employeeId, consumedAt: null, purpose },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, codeHash: true, expiresAt: true, attempts: true },
  });
  const m = await matchOtp(code, candidates, OTP_MAX_ATTEMPTS);
  if (!m.ok) {
    if (m.reason === "mismatch") {
      await prisma.otpCode.updateMany({ where: { id: { in: m.openIds } }, data: { attempts: { increment: 1 } } });
    }
    return { ok: false, reason: m.reason };
  }

  await prisma.otpCode.updateMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}
