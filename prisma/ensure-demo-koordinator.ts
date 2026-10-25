import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { HQ, DEMO_KOORD_CODE } from "../src/lib/constants";

const prisma = new PrismaClient();

// Demo "Koordinator" login so the client can see the field-staff flow before
// real staff exist. It is (re)created on every start ONLY while the Owner has
// not been generated yet (AppSetting.ownerGeneratedAt is null). Once the Owner
// is generated this script stops touching it, so the Owner can delete the
// account from Data Karyawan and it stays deleted.
// email/phone are fictional; request-otp shows the code on screen for DEMO_CODES.
async function main() {
  if (process.env.ENABLE_DEMO_KOORDINATOR !== "1") {
    console.log("[ensure-demo-koordinator] disabled (set ENABLE_DEMO_KOORDINATOR=1 to enable).");
    return;
  }
  const setting = await prisma.appSetting.findUnique({ where: { id: "singleton" } });
  if (setting?.ownerGeneratedAt) {
    console.log("[ensure-demo-koordinator] Owner already generated — demo Koordinator left alone (deletable).");
    return;
  }
  await prisma.employee.upsert({
    where: { code: DEMO_KOORD_CODE },
    update: {},
    create: {
      code: DEMO_KOORD_CODE,
      name: "Koordinator Demo",
      email: "koordinator.demo@example.com",
      phone: "081200000065",
      role: "Koordinator",
      accessRole: "KARYAWAN",
      level: "GOLD",
      homeLat: HQ.lat,
      homeLng: HQ.lng,
      homePlace: "Kantor Pusat",
    },
  });
  console.log(`[ensure-demo-koordinator] demo Koordinator pinned (${DEMO_KOORD_CODE}) until the Owner is generated.`);
}

main()
  .catch((e) => {
    console.error("[ensure-demo-koordinator] failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
