// Pure labels/helpers for the Riwayat Aktivitas (audit log) — no DB access so they can be unit tested
// and shared by the server (writing) and the Pusat Sistem page (reading).

export const AUDIT_ACTIONS = {
  EMPLOYEE_UPDATE: "Data karyawan diubah",
  EMPLOYEE_DELETE: "Karyawan dihapus",
  EMPLOYEE_STATUS: "Status karyawan diubah",
  KASBON_DECIDE: "Keputusan kasbon",
  KASBON_TRANSFER: "Kasbon ditandai ditransfer",
  PAYSLIP_ADD: "Rincian slip pay ditambah",
  PAYSLIP_EDIT: "Rincian slip pay diubah",
  PAYSLIP_DELETE: "Rincian slip pay dihapus",
  VOUCHER_ADD: "Pendapatan (voucher) ditambah",
  BACKUP_DOWNLOAD: "Backup database diunduh",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export function auditActionLabel(action: string): string {
  return (AUDIT_ACTIONS as Record<string, string>)[action] ?? action;
}

/** CONSULTANT is the vendor's reserved support tier — shown identically to Owner so it never surfaces as a distinct role. */
export function auditRoleLabel(role: string): string {
  switch (role) {
    case "OWNER":
    case "CONSULTANT":
      return "Owner";
    case "MANAGER":
      return "Manager";
    case "ADMIN_PUSAT":
      return "Admin Pusat";
    case "SUPERVISOR":
      return "Kepala Mess";
    default:
      return role;
  }
}

function rp(n: number | null | undefined): string {
  return n == null ? "—" : "Rp " + Math.round(n).toLocaleString("id-ID");
}

/** "Gaji Rp 3.000.000 → Rp 3.500.000" style summary of what changed on an employee (empty string = nothing notable). */
export function describeEmployeeChange(
  before: { salary: number | null; role: string; level: string | null; name: string },
  after: { salary: number | null; role: string; level: string | null; name: string },
): string {
  const parts: string[] = [];
  if (before.salary !== after.salary) parts.push(`Gaji ${rp(before.salary)} → ${rp(after.salary)}`);
  if (before.role !== after.role) parts.push(`Peran ${before.role} → ${after.role}`);
  if (before.level !== after.level) parts.push(`Level ${before.level ?? "—"} → ${after.level ?? "—"}`);
  if (before.name !== after.name) parts.push(`Nama ${before.name} → ${after.name}`);
  return parts.join(" · ");
}
