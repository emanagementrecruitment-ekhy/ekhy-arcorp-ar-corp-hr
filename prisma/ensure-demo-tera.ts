import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { HQ, DEMO_TERA_CODE } from "../src/lib/constants";

const prisma = new PrismaClient();

// A deliberate, permanent demo fixture — requested as a standing example of
// a "Tera" (Pendapatan/VCR) employee login, for walkthroughs and testing of
// the Pendapatan flow. Unlike the fictional demo staff purged for good by
// cleanup-demo-employees.ts, this one is meant to stay: it's upserted by
// code every start (same pattern as ensure-office-accounts.ts), so it
// survives every redeploy/restart and any field edited here stays in sync.
// Level/customRate/salary aren't touched on update so an admin's later
// change via Data Karyawan sticks.
//
// email/phone below aren't real — nobody can receive an OTP sent to them.
// issueOtp() (src/lib/otp.ts) special-cases DEMO_TERA_CODE to always show
// the code on-screen instead, in every environment, so this account stays
// loggable without a real inbox/WhatsApp.
const DEMO_TERA = {
  code: DEMO_TERA_CODE,
  name: "Grace",
  email: "grace.demo@arcorp.id",
  phone: "081200000064",
  role: "Tera",
  level: "GOLD",
  ageYears: 21,
  weightKg: 64,
  heightCm: 160,
};

// Example self-check-in marks for the Absensi Harian box feature (September
// 2026, its launch month) — a static illustration so the dashboard/Slip Pay
// integration isn't empty on a fresh look, not a real attendance record.
// Idempotent (upsert on the same unique key as a real check-in), so it's
// safe to run on every restart without ever duplicating or drifting.
const DEMO_ATTENDANCE_DAYS = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12];

async function main() {
  const employee = await prisma.employee.upsert({
    where: { code: DEMO_TERA.code },
    update: {
      name: DEMO_TERA.name,
      email: DEMO_TERA.email,
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

  for (const d of DEMO_ATTENDANCE_DAYS) {
    const dateKey = `2026-09-${String(d).padStart(2, "0")}`;
    await prisma.attendance.upsert({
      where: { employeeId_dateKey: { employeeId: employee.id, dateKey } },
      update: {},
      create: { employeeId: employee.id, dateKey, month: "2026-09" },
    });
  }

  console.log(`[ensure-demo-tera] demo Tera account pinned: ${DEMO_TERA.name} (${DEMO_TERA.code})`);
}

main()
  .catch((e) => {
    console.error("[ensure-demo-tera] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
