import "server-only";
import nodemailer from "nodemailer";

/**
 * Real OTP delivery channels. All are optional and activated purely by the
 * presence of their env vars — set none and the app falls back to console +
 * on-screen dev codes (see src/lib/otp.ts).
 */

let mailer: ReturnType<typeof nodemailer.createTransport> | null | undefined;

function getMailer() {
  if (mailer !== undefined) return mailer;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    mailer = null;
    return mailer;
  }
  mailer = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // A stuck/unreachable SMTP host must fail fast — otherwise the OTP
    // request hangs on nodemailer's much longer default timeouts, and the
    // login screen just sits there instead of falling back to the
    // console-logged code.
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 8_000,
  });
  return mailer;
}

export function emailProviderConfigured() {
  return getMailer() !== null;
}

export async function sendOtpEmail(to: string, code: string) {
  const transport = getMailer();
  if (!transport) throw new Error("SMTP is not configured");
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Kode verifikasi AR Corp",
    text: `Kode verifikasi Anda: ${code} (berlaku 5 menit). Jangan bagikan kode ini kepada siapa pun.`,
  });
}

export function smsProviderConfigured() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  return Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER);
}

/** Sends over Twilio's REST API directly (no SDK) — https://www.twilio.com/docs/sms/api */
export async function sendOtpSms(toPhoneDigits: string, code: string) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    throw new Error("Twilio is not configured");
  }
  const to = toPhoneDigits.startsWith("+") ? toPhoneDigits : `+62${toPhoneDigits.replace(/^0/, "")}`;
  const body = new URLSearchParams({
    To: to,
    From: TWILIO_FROM_NUMBER,
    Body: `Kode verifikasi AR Corp Anda: ${code} (berlaku 5 menit).`,
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Twilio send failed: ${res.status} ${detail}`);
  }
}

export function whatsappProviderConfigured() {
  return Boolean(process.env.FONNTE_TOKEN);
}

/** Sends via Fonnte (https://fonnte.com) — an Indonesian WhatsApp gateway that only needs a device token, no Meta Business verification. */
export async function sendOtpWhatsapp(toPhoneDigits: string, code: string) {
  const token = process.env.FONNTE_TOKEN;
  if (!token) throw new Error("Fonnte is not configured");
  const target = toPhoneDigits.startsWith("62") ? toPhoneDigits : `62${toPhoneDigits.replace(/^0/, "")}`;
  const body = new URLSearchParams({
    target,
    message: `Kode verifikasi AR Corp Anda: ${code} (berlaku 5 menit). Jangan bagikan kode ini kepada siapa pun.`,
  });
  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.status === false) {
    throw new Error(`Fonnte send failed: ${res.status} ${JSON.stringify(data)}`);
  }
}
