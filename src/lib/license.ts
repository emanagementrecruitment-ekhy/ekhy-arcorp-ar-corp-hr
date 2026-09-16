import "server-only";
import pkg from "../../package.json";
import { prisma } from "./prisma";
import { SETTING_ID } from "./settings";

/**
 * Licensing for cloned/white-label deployments of this app — see AR License
 * Console (a separate project the vendor runs). Purely opt-in via env vars:
 * unset LICENSE_SERVER_URL/CLIENT_ID (e.g. this vendor's own reference
 * instance, or local dev) means no license gate at all, matching how every
 * other optional integration in this app already behaves (see
 * otp-providers.ts). Once both are set for a deployment, generating/
 * patenkan the Owner requires a valid one-time activation code from the
 * vendor — see src/app/api/admin/owner-identity/route.ts.
 */
export function licensingConfigured(): boolean {
  return Boolean(process.env.LICENSE_SERVER_URL && process.env.CLIENT_ID);
}

export async function validateActivationCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const licenseServerUrl = process.env.LICENSE_SERVER_URL;
  const clientId = process.env.CLIENT_ID;
  if (!licenseServerUrl || !clientId) return { ok: true }; // licensing not configured for this deployment

  try {
    const res = await fetch(`${licenseServerUrl}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, code }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: data?.error ?? "Kode aktivasi tidak valid." };
    return { ok: true };
  } catch (e) {
    console.error("[license] validate failed:", e);
    return { ok: false, error: "Tidak bisa menghubungi server lisensi. Periksa koneksi internet lalu coba lagi." };
  }
}

/** Fire-and-forget heartbeat — never blocks or fails the login it rides along with. Also refreshes the cached employeeLimit (see AppSetting) from the vendor's response. */
export function reportCheckin(): void {
  const licenseServerUrl = process.env.LICENSE_SERVER_URL;
  const clientId = process.env.CLIENT_ID;
  if (!licenseServerUrl || !clientId) return;

  fetch(`${licenseServerUrl}/api/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, version: pkg.version }),
    signal: AbortSignal.timeout(8_000),
  })
    .then((res) => res.json())
    .then((data) => {
      if (typeof data?.employeeLimit === "number" || data?.employeeLimit === null) {
        return prisma.appSetting.upsert({
          where: { id: SETTING_ID },
          create: { id: SETTING_ID, employeeLimit: data.employeeLimit },
          update: { employeeLimit: data.employeeLimit },
        });
      }
    })
    .catch((e) => console.error("[license] checkin failed:", e));
}

/** Reads the cached employee/Tera cap for this deployment. null = unlimited or licensing not configured. */
export async function getEmployeeLimit(): Promise<number | null> {
  if (!licensingConfigured()) return null;
  const row = await prisma.appSetting.findUnique({ where: { id: SETTING_ID } });
  return row?.employeeLimit ?? null;
}

/** Redeems a one-time upgrade code against the vendor's License Server, raising this deployment's cached employeeLimit on success. */
export async function validateUpgradeCode(code: string): Promise<{ ok: boolean; error?: string; employeeLimit?: number | null }> {
  const licenseServerUrl = process.env.LICENSE_SERVER_URL;
  const clientId = process.env.CLIENT_ID;
  if (!licenseServerUrl || !clientId) return { ok: false, error: "Fitur ini hanya untuk deployment yang terhubung ke License Server." };

  try {
    const res = await fetch(`${licenseServerUrl}/api/validate-upgrade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, code }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: data?.error ?? "Kode upgrade tidak valid." };

    await prisma.appSetting.upsert({
      where: { id: SETTING_ID },
      create: { id: SETTING_ID, employeeLimit: data.employeeLimit ?? null },
      update: { employeeLimit: data.employeeLimit ?? null },
    });
    return { ok: true, employeeLimit: data.employeeLimit ?? null };
  } catch (e) {
    console.error("[license] validate-upgrade failed:", e);
    return { ok: false, error: "Tidak bisa menghubungi server lisensi. Periksa koneksi internet lalu coba lagi." };
  }
}
