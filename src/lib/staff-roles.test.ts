import { test } from "node:test";
import assert from "node:assert/strict";
import { STAFF_ROLES, isStaffRole } from "./constants";

test("appointed roles stay on the roster, system accounts do not", () => {
  for (const r of ["KARYAWAN", "ADMIN_PUSAT", "SUPERVISOR", "MANAGER"]) assert.equal(isStaffRole(r), true, r);
  for (const r of ["OWNER", "CONSULTANT", "", null, undefined, "UNKNOWN"]) assert.equal(isStaffRole(r as string), false, String(r));
  assert.equal(STAFF_ROLES.length, 4);
});
