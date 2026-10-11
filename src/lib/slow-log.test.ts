import { test } from "node:test";
import assert from "node:assert/strict";
import { isSlow, isTrackedPath, pathOnly, formatSlowLine } from "./slow-log";

test("threshold", () => {
  assert.equal(isSlow(499, 500), false);
  assert.equal(isSlow(500, 500), true);
});
test("static assets are skipped", () => {
  assert.equal(isTrackedPath("/_next/static/chunk.js"), false);
  assert.equal(isTrackedPath("/api/admin/overview"), true);
  assert.equal(isTrackedPath(undefined), false);
});
test("query string is dropped from the log line", () => {
  assert.equal(pathOnly("/api/x?name=a"), "/api/x");
  assert.equal(formatSlowLine("GET", "/api/x?q=1", 200, 812.4), "[slow] GET /api/x 200 812ms");
});
