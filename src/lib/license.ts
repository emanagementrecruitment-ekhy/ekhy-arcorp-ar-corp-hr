import "server-only";
import pkg from "../../package.json";

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

/** Fire-and-forget heartbeat — never blocks or fails the login it rides along with. */
export function reportCheckin(): void {
  const licenseServerUrl = process.env.LICENSE_SERVER_URL;
  const clientId = process.env.CLIENT_ID;
  if (!licenseServerUrl || !clientId) return;

  fetch(`${licenseServerUrl}/api/checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, version: pkg.version }),
    signal: AbortSignal.timeout(8_000),
  }).catch((e) => console.error("[license] checkin failed:", e));
}
