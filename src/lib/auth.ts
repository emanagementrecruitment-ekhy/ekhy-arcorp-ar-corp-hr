import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { AccessRole } from "./constants";
import { SESSION_COOKIE, sessionTtlSeconds } from "./constants";

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Add it to arcorp-hr/.env (see .env.example)."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  employeeId: string;
  accessRole: AccessRole;
  name: string;
  code: string;
}

export async function createSession(payload: SessionPayload) {
  const ttl = sessionTtlSeconds(payload.accessRole);
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttl)
    .sign(secretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ttl,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      employeeId: payload.employeeId as string,
      accessRole: payload.accessRole as AccessRole,
      name: payload.name as string,
      code: payload.code as string,
    };
  } catch {
    return null;
  }
}
