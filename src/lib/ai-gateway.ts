/**
 * Optional central AI gateway for "Ara" (employee chat). Plain functions with no framework imports so they can be
 * unit-tested; only ai-assistant.ts (server-only) calls them.
 *
 * Off by default: nothing changes for a client until AI_PROVIDER=gateway plus AI_GATEWAY_URL and AI_GATEWAY_TOKEN
 * are set in that client's environment. The gateway token is a server secret — never expose it to the browser.
 */

export interface GatewayConfig {
  url: string;
  token: string;
}

export interface GatewayMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GatewayIdentity {
  name: string;
  firstName: string;
  code: string;
}

/** Placeholder the model writes where the employee's first name belongs; the app swaps the real name back in. */
export const NAME_PLACEHOLDER = "{{NAMA}}";

const GATEWAY_TIMEOUT_MS = 45_000;
// Replies are capped at 5 short sentences by the prompt, so a small budget is plenty and saves the shared free quota.
const GATEWAY_MAX_TOKENS = 400;

/** Gateway settings, or null when the gateway is not (fully) configured. */
export function gatewayConfig(env: Record<string, string | undefined> = process.env): GatewayConfig | null {
  if (env.AI_PROVIDER?.trim().toLowerCase() !== "gateway") return null;
  const url = env.AI_GATEWAY_URL?.trim() ?? "";
  const token = env.AI_GATEWAY_TOKEN?.trim() ?? "";
  if (!url || !token) return null;
  try {
    const parsed = new URL(url);
    // The token travels in a header, so only ever send it over HTTPS (plain http only for local testing).
    const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) return null;
  } catch {
    return null;
  }
  return { url, token };
}

/** Which backend answers free-form questions: the gateway when explicitly chosen, else Claude if a key exists. */
export function aiProvider(env: Record<string, string | undefined> = process.env): "gateway" | "anthropic" | null {
  if (env.AI_PROVIDER?.trim().toLowerCase() === "gateway") return gatewayConfig(env) ? "gateway" : null;
  return env.ANTHROPIC_API_KEY?.trim() ? "anthropic" : null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replaces the employee's name and code with the placeholder, so identity does not leave the server. */
export function scrubIdentity(text: string, who: GatewayIdentity): string {
  const terms = [who.name, who.firstName, who.code]
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    // Longest first, so "Siti Aminah" is replaced as a whole before "Siti".
    .sort((a, b) => b.length - a.length);
  let out = text;
  for (const term of terms) {
    out = out.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`, "giu"), NAME_PLACEHOLDER);
  }
  return out;
}

/** Puts the real first name back where the model used the placeholder (tolerates {NAMA} / {{ nama }} slips). */
export function restoreName(text: string, firstName: string): string {
  return text.replace(/\{\{?\s*NAMA\s*\}?\}/gi, firstName);
}

/** Calls the gateway with an already-anonymised system prompt and returns the model's text. */
export async function askGateway(
  cfg: GatewayConfig,
  system: string,
  messages: GatewayMessage[],
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(cfg.url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.token}` },
    body: JSON.stringify({ system, messages, max_tokens: GATEWAY_MAX_TOKENS }),
    signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    cache: "no-store",
  });
  // Never put the response body in the error: keep this path free of anything the gateway echoed back.
  if (!res.ok) throw new Error(`AI gateway HTTP ${res.status}`);
  const data = (await res.json().catch(() => null)) as { reply?: unknown } | null;
  const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
  if (!reply) throw new Error("Empty AI gateway reply");
  return reply;
}
