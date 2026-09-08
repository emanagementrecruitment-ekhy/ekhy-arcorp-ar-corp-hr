import "server-only";
import { prisma } from "./prisma";

export type Portal = "karyawan" | "pusat";
export type IdentifierKind = "email" | "phone";

export function normalizeIdentifier(raw: string) {
  const v = raw.trim().toLowerCase();
  if (v.includes("@")) return { kind: "email" as const, value: v };
  return { kind: "phone" as const, value: v.replace(/\D/g, "") };
}

export async function findEmployeeForPortal(identifier: string, portal: Portal) {
  const norm = normalizeIdentifier(identifier);
  if (!norm.value) return null;

  const employee =
    norm.kind === "email"
      ? await prisma.employee.findUnique({ where: { email: norm.value } })
      : await prisma.employee.findUnique({ where: { phone: norm.value } });

  if (!employee) return null;

  // "Office" here just means "not a field employee" — it decides which login
  // tab (STAFF & PR vs. OFFICE) an account uses, not what it's allowed to see
  // once logged in (that's OFFICE_ROLES, checked per-route via requireSession).
  const isOffice = employee.accessRole !== "KARYAWAN";
  if (portal === "pusat" && !isOffice) return null;
  if (portal === "karyawan" && isOffice) return null;

  return employee;
}
