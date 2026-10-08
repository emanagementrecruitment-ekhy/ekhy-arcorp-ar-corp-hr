import { test } from "node:test";
import assert from "node:assert/strict";
import { countNewUnread } from "./notif-sound";

test("countNewUnread counts only unseen unread items and remembers them", () => {
  const seen = new Set<string>();
  assert.equal(countNewUnread(seen, [{ id: "a", read: true }, { id: "b", read: false }]), 1);
  assert.equal(countNewUnread(seen, [{ id: "a", read: true }, { id: "b", read: false }]), 0);
  assert.equal(countNewUnread(seen, [{ id: "c", read: false }, { id: "d", read: false }, { id: "b", read: false }]), 2);
});

test("countNewUnread ignores read items", () => {
  assert.equal(countNewUnread(new Set(), [{ id: "x", read: true }]), 0);
});
