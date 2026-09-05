import "server-only";
import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";
import type { AccessRole } from "./constants";

export class ApiAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Loads the session and throws ApiAuthError (catch at the route level) if it doesn't satisfy `roles`. */
export async function requireSession(roles?: AccessRole[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiAuthError(401, "Silakan login kembali.");
  if (roles && !roles.includes(session.accessRole)) {
    throw new ApiAuthError(403, "Anda tidak memiliki akses ke fitur ini.");
  }
  return session;
}

export function apiError(e: unknown) {
  if (e instanceof ApiAuthError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Terjadi kesalahan pada server." }, { status: 500 });
}
