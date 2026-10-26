import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { HQ } from "../src/lib/constants";

const prisma = new PrismaClient();

// Runs on every production start (see package.json "start:railway"). The
// placeholder office accounts (Owner/Admin Pusat/Kepala Mess) that used to
// be auto-created here are retired — Consultant now holds full
// Owner-equivalent access (see OFFICE_ROLES in src/lib/constants.ts) and is
// the only account this app bootstraps on its own; any other office-tier
// login is created deliberately, for a real person, through the admin
// panel. The Consultant seat is pinned to a specific real person's login
// rather than a placeholder email, so it's upserted by `code` and kept in
// sync on every start — even if an older row from a previous deploy still
// exists under that same code.
// Displayed name/role are deliberately generic ("Admin", not "Consultant")
// even though accessRole stays CONSULTANT internally — not every client
// engagement has a Consultant, so nothing in the UI should ever name this
// seat as one (see the client-facing text sweep across the app).
const CONSULTANT_ACCOUNT = {
  code: "HQ-CONSULT",
  name: "Admin",
  role: process.env.OFFICE_ADMIN_ROLE || "Admin AR Corp",
  accessRole: "CONSULTANT",
  // Per-client override via env (Railway variables); defaults keep AR Corporation unchanged.
  email: process.env.OFFICE_ADMIN_EMAIL || "official.arcorporation@gmail.com",
  phone: process.env.OFFICE_ADMIN_PHONE || "087843860999",
};

async function main() {
  const existing = await prisma.employee.findUnique({ where: { code: CONSULTANT_ACCOUNT.code } });

  // email/phone are unique: never let a clash with another record take the app down.
  // If another employee already owns the wanted value, keep what the seat has (or leave it empty on create).
  const clash = async (field: "email" | "phone", value: string) => {
    const other = await prisma.employee.findFirst({ where: { [field]: value, NOT: { code: CONSULTANT_ACCOUNT.code } }, select: { code: true } });
    if (other) console.warn(`[ensure-office-accounts] ${field} ${value} already used by ${other.code}; not applied to ${CONSULTANT_ACCOUNT.code}`);
    return Boolean(other);
  };
  const emailOk = !(await clash("email", CONSULTANT_ACCOUNT.email));
  const phoneOk = !(await clash("phone", CONSULTANT_ACCOUNT.phone));

  await prisma.employee.upsert({
    where: { code: CONSULTANT_ACCOUNT.code },
    update: {
      name: CONSULTANT_ACCOUNT.name,
      role: CONSULTANT_ACCOUNT.role,
      ...(emailOk ? { email: CONSULTANT_ACCOUNT.email } : {}),
      ...(phoneOk ? { phone: CONSULTANT_ACCOUNT.phone } : {}),
    },
    create: {
      ...CONSULTANT_ACCOUNT,
      email: emailOk ? CONSULTANT_ACCOUNT.email : "hq-consult@placeholder.invalid",
      phone: phoneOk ? CONSULTANT_ACCOUNT.phone : "000-HQ-CONSULT",
      level: "PLATINUM",
      homeLat: HQ.lat,
      homeLng: HQ.lng,
      homePlace: "Kantor Pusat Jakarta",
    },
  });
  console.log(`[ensure-office-accounts] consultant seat ok (existing=${Boolean(existing)}, email applied=${emailOk})`);
}

// Best-effort bootstrap: a failure here must never stop the server from starting.
main()
  .catch((e) => {
    console.error("[ensure-office-accounts] failed (continuing startup):", e);
  })
  .finally(() => prisma.$disconnect());
