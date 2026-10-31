import { test } from "node:test";
import assert from "node:assert/strict";
import { aiDisclosure } from "./privacy-notice";

test("gateway clients name Cloudflare, say names are removed and admit the unknown server location", () => {
  const d = aiDisclosure("gateway");
  assert.equal(d.vendor, "Cloudflare Workers AI");
  assert.match(d.employee, /Nama dan kode karyawan dibuang/);
  assert.match(d.office, /tanpa nama/);
  assert.match(d.handling, /luar Indonesia/);
});

test("Claude clients are named as such and make no claim about what the provider stores", () => {
  const d = aiDisclosure("anthropic");
  assert.equal(d.vendor, "Anthropic (Claude)");
  assert.doesNotMatch(d.handling, /tidak disimpan/);
  assert.match(d.handling, /luar Indonesia/);
});

test("without an AI provider the notice says nothing leaves the server", () => {
  const d = aiDisclosure(null);
  assert.equal(d.vendor, null);
  assert.match(d.employee, /Tidak ada pertanyaan atau data yang dikirim/);
  assert.equal(d.handling, "");
});

test("no variant mentions the call center, API keys or other technical terms", () => {
  for (const p of ["gateway", "anthropic", null] as const) {
    const d = aiDisclosure(p);
    assert.doesNotMatch(`${d.employee} ${d.office} ${d.handling}`, /Call Center|API_KEY|token/i);
  }
});
