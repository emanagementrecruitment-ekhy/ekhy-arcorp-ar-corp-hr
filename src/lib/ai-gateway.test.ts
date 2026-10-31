import { test } from "node:test";
import assert from "node:assert/strict";
import { aiProvider, askGateway, gatewayConfig, restoreName, scrubIdentity } from "./ai-gateway";

const who = { name: "Siti Aminah", firstName: "Siti", code: "AR-07" };
const gw = { AI_PROVIDER: "gateway", AI_GATEWAY_URL: "https://ai.example.workers.dev/v1/chat", AI_GATEWAY_TOKEN: "secret-token" };

test("gateway stays off unless explicitly chosen and fully configured", () => {
  assert.equal(gatewayConfig({}), null);
  assert.equal(gatewayConfig({ ...gw, AI_PROVIDER: "" }), null);
  assert.equal(gatewayConfig({ ...gw, AI_GATEWAY_TOKEN: "  " }), null);
  assert.equal(gatewayConfig({ ...gw, AI_GATEWAY_URL: "" }), null);
  assert.deepEqual(gatewayConfig(gw), { url: gw.AI_GATEWAY_URL, token: "secret-token" });
});

test("the token is only ever sent over https (plain http only on localhost)", () => {
  assert.equal(gatewayConfig({ ...gw, AI_GATEWAY_URL: "http://ai.example.com/v1/chat" }), null);
  assert.equal(gatewayConfig({ ...gw, AI_GATEWAY_URL: "not a url" }), null);
  assert.ok(gatewayConfig({ ...gw, AI_GATEWAY_URL: "http://localhost:8787/v1/chat" }));
});

test("provider keeps the old behaviour by default and never falls back to Claude when the gateway was chosen", () => {
  assert.equal(aiProvider({}), null);
  assert.equal(aiProvider({ ANTHROPIC_API_KEY: "sk-test" }), "anthropic");
  assert.equal(aiProvider({ ...gw, ANTHROPIC_API_KEY: "sk-test" }), "gateway");
  // Gateway chosen but incomplete: stay rule-based instead of silently sending data to another service.
  assert.equal(aiProvider({ AI_PROVIDER: "gateway", ANTHROPIC_API_KEY: "sk-test" }), null);
});

test("scrubIdentity removes name, first name and code but leaves other words alone", () => {
  assert.equal(scrubIdentity("Halo Siti Aminah, kode AR-07 hadir", who), "Halo {{NAMA}}, kode {{NAMA}} hadir");
  assert.equal(scrubIdentity("tolong cek siti ya", who), "tolong cek {{NAMA}} ya");
  // A different word that merely contains the name is not touched.
  assert.equal(scrubIdentity("Sitinjak dan Sitihajar", who), "Sitinjak dan Sitihajar");
  assert.equal(scrubIdentity("tanpa nama", who), "tanpa nama");
  // Regex characters in a code must not break the replacement.
  assert.equal(scrubIdentity("kode A.R+07", { name: "Budi", firstName: "Budi", code: "A.R+07" }), "kode {{NAMA}}");
});

test("restoreName puts the first name back, tolerating small slips", () => {
  assert.equal(restoreName("Halo {{NAMA}}! Semangat, {{ nama }}.", "Siti"), "Halo Siti! Semangat, Siti.");
  assert.equal(restoreName("Halo {NAMA}", "Siti"), "Halo Siti");
  assert.equal(restoreName("Halo kak", "Siti"), "Halo kak");
});

test("askGateway sends the bearer token and returns the reply", async () => {
  let seen: { url: string; headers: Record<string, string>; body: string } | null = null;
  const fake = (async (url: string, init: RequestInit) => {
    seen = { url, headers: init.headers as Record<string, string>, body: String(init.body) };
    return new Response(JSON.stringify({ reply: "  Halo {{NAMA}}  " }), { status: 200 });
  }) as unknown as typeof fetch;
  const out = await askGateway({ url: gw.AI_GATEWAY_URL, token: "secret-token" }, "sys", [{ role: "user", content: "hai" }], fake);
  assert.equal(out, "Halo {{NAMA}}");
  assert.equal(seen!.url, gw.AI_GATEWAY_URL);
  assert.equal(seen!.headers.authorization, "Bearer secret-token");
  assert.deepEqual(JSON.parse(seen!.body), { system: "sys", messages: [{ role: "user", content: "hai" }], max_tokens: 400 });
});

test("askGateway fails on HTTP errors and empty replies without echoing the response body", async () => {
  const cfg = { url: gw.AI_GATEWAY_URL, token: "t" };
  const bad = (async () => new Response("secret details", { status: 502 })) as unknown as typeof fetch;
  await assert.rejects(() => askGateway(cfg, "s", [], bad), (e: Error) => e.message === "AI gateway HTTP 502");
  const empty = (async () => new Response(JSON.stringify({ reply: "   " }), { status: 200 })) as unknown as typeof fetch;
  await assert.rejects(() => askGateway(cfg, "s", [], empty), /Empty AI gateway reply/);
  const junk = (async () => new Response("not json", { status: 200 })) as unknown as typeof fetch;
  await assert.rejects(() => askGateway(cfg, "s", [], junk), /Empty AI gateway reply/);
});
