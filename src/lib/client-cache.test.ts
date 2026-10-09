import { test } from "node:test";
import assert from "node:assert/strict";
import { cachedJson, clearCachedJson } from "./client-cache";

function stubFetch(body: unknown, counter: { n: number }) {
  globalThis.fetch = (async () => {
    counter.n++;
    return { json: async () => body } as Response;
  }) as typeof fetch;
}

test("repeat calls within the ttl share one request", async () => {
  clearCachedJson();
  const c = { n: 0 };
  stubFetch({ ok: 1 }, c);
  const [a, b] = await Promise.all([cachedJson("/x", 1000), cachedJson("/x", 1000)]);
  assert.deepEqual(a, { ok: 1 });
  assert.deepEqual(b, { ok: 1 });
  await cachedJson("/x", 1000);
  assert.equal(c.n, 1);
});

test("an expired entry is fetched again", async () => {
  clearCachedJson();
  const c = { n: 0 };
  stubFetch({ ok: 1 }, c);
  await cachedJson("/y", 0);
  await cachedJson("/y", 0);
  assert.equal(c.n, 2);
});

test("a failed request is not cached", async () => {
  clearCachedJson();
  globalThis.fetch = (async () => {
    throw new Error("offline");
  }) as typeof fetch;
  await assert.rejects(cachedJson("/z", 1000));
  const c = { n: 0 };
  stubFetch({ ok: 2 }, c);
  assert.deepEqual(await cachedJson("/z", 1000), { ok: 2 });
  assert.equal(c.n, 1);
});
