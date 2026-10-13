import { test } from "node:test";
import assert from "node:assert/strict";
import { anthropicHeadersFromEnv } from "./ai-client-config";

test("no workspace id means no extra header", () => {
  assert.equal(anthropicHeadersFromEnv({}), undefined);
  assert.equal(anthropicHeadersFromEnv({ ANTHROPIC_WORKSPACE_ID: "" }), undefined);
  assert.equal(anthropicHeadersFromEnv({ ANTHROPIC_WORKSPACE_ID: "   " }), undefined);
});

test("workspace id is sent as anthropic-workspace-id, trimmed and unquoted", () => {
  assert.deepEqual(anthropicHeadersFromEnv({ ANTHROPIC_WORKSPACE_ID: "wrkspc_abc123" }), {
    "anthropic-workspace-id": "wrkspc_abc123",
  });
  assert.deepEqual(anthropicHeadersFromEnv({ ANTHROPIC_WORKSPACE_ID: '  "wrkspc_abc123"\n' }), {
    "anthropic-workspace-id": "wrkspc_abc123",
  });
});
