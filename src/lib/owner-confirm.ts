import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import { issueOtp, verifyOtp } from "./otp";
import { maskEmail } from "./mask-email";

/**
 * "Password" for the Arsip Slip Resign and for deleting an employee: a one-time code that is
 * emailed ONLY to the Owner account(s). Whoever asks (Owner/Konsultan/Manager) has to get the
 * code from the Owner and type it in — so nothing happens without the Owner's say-so.
 */
export const OWNER_CONFIRM_PURPOSE = "OWNER_CONFIRM";
const UNLOCK_COOKIE = "arcorp_arsip_unlock";
const UNLOCK_TTL_S = 15 * 60;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

async function activeOwners() {
  return prisma.employee.findMany({
    where: { accessRole: "OWNER", status: "AKTIF" },
    select: { id: true, email: true },
  });
}

/** Emails a fresh code to every active Owner. Returns null when there is no Owner account at all. */
export async function sendOwnerCode() {
  const owners = await activeOwners();
  if (owners.length === 0) return null;
  let devCode: string | undefined;
  let delivered = false;
  for (const o of owners) {
    const r = await issueOtp(o.id, o.email, "email", false, OWNER_CONFIRM_PURPOSE);
    delivered = delivered || r.delivered;
    devCode = devCode ?? r.devCode;
  }
  return { sentTo: owners.map((o) => maskEmail(o.email)), delivered, devCode };
}

/** True when `code` matches the latest unused Owner confirmation code of any Owner (and consumes it). */
export async function checkOwnerCode(code: string): Promise<boolean> {
  const clean = code.trim();
  if (!/^\d{6}$/.test(clean)) return false;
  for (const o of await activeOwners()) {
    if ((await verifyOtp(o.id, clean, OWNER_CONFIRM_PURPOSE)).ok) return true;
  }
  return false;
}

export async function grantArchiveUnlock(employeeId: string) {
  const token = await new SignJWT({ p: "arsip" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(employeeId)
    .setExpirationTime(Math.floor(Date.now() / 1000) + UNLOCK_TTL_S)
    .sign(key());
  (await cookies()).set(UNLOCK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/admin",
    maxAge: UNLOCK_TTL_S,
  });
}

/** The unlock only counts for the same signed-in person who entered the code. */
export async function hasArchiveUnlock(employeeId: string): Promise<boolean> {
  const token = (await cookies()).get(UNLOCK_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload.p === "arsip" && payload.sub === employeeId;
  } catch {
    return false;
  }
}
