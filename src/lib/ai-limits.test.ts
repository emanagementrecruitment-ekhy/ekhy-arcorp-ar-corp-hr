import { test } from "node:test";
import assert from "node:assert/strict";
import { ADMIN_MULTIPLIER, DEFAULT_GLOBAL_DAILY, DEFAULT_PER_USER_DAILY, aiLimitsFromEnv, limitNotice, parseLimit } from "./ai-limits";

test("parseLimit accepts whole numbers, zero included, and falls back otherwise", () => {
  assert.equal(parseLimit("50", 9), 50);
  assert.equal(parseLimit(" 7 ", 9), 7);
  assert.equal(parseLimit("0", 9), 0);
  assert.equal(parseLimit("", 9), 9);
  assert.equal(parseLimit(undefined, 9), 9);
  assert.equal(parseLimit("-3", 9), 9);
  assert.equal(parseLimit("2.5", 9), 9);
  assert.equal(parseLimit("banyak", 9), 9);
});

test("limits come from the environment with safe defaults, and the office gets a larger personal allowance", () => {
  assert.deepEqual(aiLimitsFromEnv({}), {
    global: DEFAULT_GLOBAL_DAILY,
    perUser: DEFAULT_PER_USER_DAILY,
    perAdmin: DEFAULT_PER_USER_DAILY * ADMIN_MULTIPLIER,
  });
  const custom = aiLimitsFromEnv({ ASSISTANT_AI_DAILY_LIMIT: "100", ASSISTANT_AI_PER_USER_LIMIT: "5" });
  assert.deepEqual(custom, { global: 100, perUser: 5, perAdmin: 15 });
  assert.equal(aiLimitsFromEnv({ ASSISTANT_AI_DAILY_LIMIT: "0" }).global, 0);
});

test("limit notices tell the person what still works", () => {
  assert.match(limitNotice("user"), /pertanyaan umum/);
  assert.match(limitNotice("global"), /batas harian/);
});
