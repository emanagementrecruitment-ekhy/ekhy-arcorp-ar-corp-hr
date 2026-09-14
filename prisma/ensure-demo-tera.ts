import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { HQ } from "../src/lib/constants";

const prisma = new PrismaClient();

// A deliberate, permanent demo fixture — requested as a standing example of
// a "Tera" (Pendapatan/VCR) employee login, for walkthroughs and testing of
// the Pendapatan flow. Unlike the fictional demo staff purged for good by
// cleanup-demo-employees.ts, this one is meant to stay: it's upserted by
// code every start (same pattern as ensure-office-accounts.ts), so it
// survives every redeploy/restart and any field edited here stays in sync.
// Level/customRate/salary aren't touched on update so an admin's later
// change via Data Karyawan sticks.
const DEMO_TERA = {
  code: "DEMO-01",
  name: "Grace",
  email: "grace.demo@dearmanagement.id",
  phone: "081200000064",
  role: "Tera",
  level: "GOLD",
  ageYears: 21,
  weightKg: 64,
  heightCm: 160,
};

async function main() {
  await prisma.employee.upsert({
    where: { code: DEMO_TERA.code },
    update: {
      name: DEMO_TERA.name,
      role: DEMO_TERA.role,
      ageYears: DEMO_TERA.ageYears,
      weightKg: DEMO_TERA.weightKg,
      heightCm: DEMO_TERA.heightCm,
    },
    create: {
      code: DEMO_TERA.code,
      name: DEMO_TERA.name,
      email: DEMO_TERA.email,
      phone: DEMO_TERA.phone,
      role: DEMO_TERA.role,
      accessRole: "KARYAWAN",
      level: DEMO_TERA.level,
      ageYears: DEMO_TERA.ageYears,
      weightKg: DEMO_TERA.weightKg,
      heightCm: DEMO_TERA.heightCm,
      homeLat: HQ.lat,
      homeLng: HQ.lng,
      homePlace: "Kantor Pusat Jakarta",
    },
  });
  console.log(`[ensure-demo-tera] demo Tera account pinned: ${DEMO_TERA.name} (${DEMO_TERA.code})`);
}

main()
  .catch((e) => {
    console.error("[ensure-demo-tera] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
