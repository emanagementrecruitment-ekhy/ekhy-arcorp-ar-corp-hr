import { test } from "node:test";
import assert from "node:assert/strict";
import { auditActionLabel, auditRoleLabel, describeEmployeeChange } from "./audit-format";

test("action and role labels", () => {
  assert.equal(auditActionLabel("KASBON_DECIDE"), "Keputusan kasbon");
  assert.equal(auditActionLabel("UNKNOWN_X"), "UNKNOWN_X");
  for (const a of ["DATA_RESET", "ASSISTANT_REMIND", "ASSISTANT_TOGGLE", "ABSEN_SELF", "KASBON_REQUEST", "VOUCHER_SELF", "PHOTO_CHANGE", "IDENTITY_CHANGE", "LOGIN", "CHAT_SEND", "ABSENSI_EDIT", "JABATAN_CHANGE", "SETTINGS_CHANGE", "PAYSLIP_SEND"]) {
    assert.notEqual(auditActionLabel(a), a, `${a} needs a label`);
  }
  assert.equal(auditRoleLabel("CONSULTANT"), "Owner");
  assert.equal(auditRoleLabel("ADMIN_PUSAT"), "Admin Pusat");
});

test("describeEmployeeChange lists only what changed", () => {
  const a = { salary: 3_000_000, role: "Staff", level: null, name: "Budi" };
  assert.equal(describeEmployeeChange(a, { ...a }), "");
  assert.equal(describeEmployeeChange(a, { ...a, salary: 3_500_000 }), "Gaji Rp 3.000.000 → Rp 3.500.000");
  assert.equal(
    describeEmployeeChange(a, { ...a, role: "Koordinator", level: "SILVER" }),
    "Peran Staff → Koordinator · Level — → SILVER",
  );
});
