import "server-only";
import { prisma } from "./prisma";
import { OFFICE_ROLES } from "./constants";

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

  const isOffice = OFFICE_ROLES.includes(employee.accessRole as (typeof OFFICE_ROLES)[number]);
  if (portal === "pusat" && !isOffice) return null;
  if (portal === "karyawan" && isOffice) return null;

  return employee;
}
