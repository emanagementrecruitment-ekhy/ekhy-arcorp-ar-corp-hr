import { PrismaClient } from "@prisma/client";
import { HQ, ATTENDANCE_RADIUS_KM } from "../src/lib/constants";
import { distanceKm } from "../src/lib/geo";

const prisma = new PrismaClient();

const EMPLOYEES = [
  { code: "AR-01", name: "Ekhy Ramadhan", level: "PLATINUM", role: "Konsultan Lapangan", email: "ekhy@arcorp.id", phone: "081233458890", place: "Jakarta Selatan", lat: -6.2615, lng: 106.8106, t: "08:12", supervisor: false },
  { code: "AR-02", name: "Dewi Anggraeni", level: "SILVER", role: "Konsultan Lapangan", email: "dewi@arcorp.id", phone: "081388902211", place: "Bandung", lat: -6.9175, lng: 107.6191, t: "08:47", supervisor: false },
  { code: "AR-03", name: "Bayu Pratama", level: "PLATINUM", role: "Supervisor Lapangan", email: "bayu@arcorp.id", phone: "081122447788", place: "Bekasi", lat: -6.2383, lng: 106.9756, t: "07:55", supervisor: true },
  { code: "AR-04", name: "Sinta Maharani", level: "SILVER", role: "Konsultan Lapangan", email: "sinta@arcorp.id", phone: "085744129003", place: "Semarang", lat: -6.9667, lng: 110.4167, t: "09:20", supervisor: false },
  { code: "AR-05", name: "Fajar Nugroho", level: "PLATINUM", role: "Konsultan Lapangan", email: "fajar@arcorp.id", phone: "081277814455", place: "Surabaya", lat: -7.2575, lng: 112.7521, t: "09:38", supervisor: false },
  { code: "AR-06", name: "Lia Kusuma", level: "SILVER", role: "Konsultan Lapangan", email: "lia@arcorp.id", phone: "089566201177", place: "Yogyakarta", lat: -7.7956, lng: 110.3695, t: "10:05", supervisor: false },
];

const OFFICE_ACCOUNTS = [
  { code: "HQ-OWNER", name: "Owner AR Corp", role: "Owner AR Corp", accessRole: "OWNER", email: "owner@arcorp.id", phone: "081100000001" },
  { code: "HQ-CONSULT", name: "Consultant AR Corp", role: "Consultant AR Corp", accessRole: "CONSULTANT", email: "consultant@arcorp.id", phone: "081100000002" },
  { code: "HQ-ADMIN", name: "Admin Pusat AR Corp", role: "Admin Pusat AR Corp", accessRole: "ADMIN_PUSAT", email: "admin@arcorp.id", phone: "081100000003" },
];

const CLIENTS = [
  "Kirana Lounge", "Aster Group", "Hotel Mahameru", "Bellagio Club", "Sapphire Karaoke",
  "PT Nusa Cemerlang", "Villa Anggrek", "The Onyx Room", "Kencana Resto", "Zafira Event",
];

const HQ_NAME_FALLBACK = "Kantor Pusat Jakarta";

// Deterministic pseudo-random generator so the seeded data is stable across `prisma migrate reset`.
function seeded(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

async function main() {
  await prisma.chatMessage.deleteMany();
  await prisma.kasbon.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.loginEvent.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.employee.deleteMany();

  const supervisorSeed = EMPLOYEES.find((e) => e.supervisor)!;
  const supervisor = await prisma.employee.create({
    data: {
      code: supervisorSeed.code,
      name: supervisorSeed.name,
      email: supervisorSeed.email,
      phone: supervisorSeed.phone,
      level: supervisorSeed.level,
      role: supervisorSeed.role,
      accessRole: "KARYAWAN",
      homeLat: supervisorSeed.lat,
      homeLng: supervisorSeed.lng,
      homePlace: supervisorSeed.place,
    },
  });

  const fieldEmployees = [supervisor];
  for (const e of EMPLOYEES) {
    if (e.supervisor) continue;
    const created = await prisma.employee.create({
      data: {
        code: e.code,
        name: e.name,
        email: e.email,
        phone: e.phone,
        level: e.level,
        role: e.role,
        accessRole: "KARYAWAN",
        homeLat: e.lat,
        homeLng: e.lng,
        homePlace: e.place,
        supervisorId: supervisor.id,
      },
    });
    fieldEmployees.push(created);
  }

  for (const acc of OFFICE_ACCOUNTS) {
    await prisma.employee.create({
      data: {
        code: acc.code,
        name: acc.name,
        email: acc.email,
        phone: acc.phone,
        level: "PLATINUM",
        role: acc.role,
        accessRole: acc.accessRole,
        homeLat: HQ.lat,
        homeLng: HQ.lng,
        homePlace: HQ_NAME_FALLBACK,
      },
    });
  }

  const byCode = new Map(fieldEmployees.map((e) => [e.code, e]));
  const meta = new Map(EMPLOYEES.map((e) => [e.code, e]));

  // Today's attendance + login feed.
  const now = new Date();
  for (const emp of fieldEmployees) {
    const m = meta.get(emp.code)!;
    const [hh, mm] = m.t.split(":").map(Number);
    const at = new Date(now);
    at.setHours(hh, mm, 0, 0);
    const d = distanceKm(HQ, { lat: m.lat, lng: m.lng });
    await prisma.loginEvent.create({
      data: {
        employeeId: emp.id,
        lat: m.lat,
        lng: m.lng,
        distanceKm: d,
        inRadius: d <= ATTENDANCE_RADIUS_KM,
        place: m.place,
        createdAt: at,
      },
    });
  }

  // 32 days of commission vouchers, mirroring the design prototype's demo generator.
  let n = 0;
  const voucherRows: {
    employeeId: string; category: string; amount: number; client: string;
    status: string; occurredAt: Date;
  }[] = [];
  for (let back = 0; back < 32; back++) {
    const day = new Date(now);
    day.setDate(now.getDate() - back);
    day.setHours(0, 0, 0, 0);
    for (let ei = 0; ei < fieldEmployees.length; ei++) {
      const emp = fieldEmployees[ei];
      const m = meta.get(emp.code)!;
      const r = seeded(back * 17 + ei * 7 + 1);
      const count = r > 0.72 ? 3 : r > 0.42 ? 2 : r > 0.16 ? 1 : 0;
      for (let c = 0; c < count; c++) {
        n++;
        const rr = seeded(n * 3.7);
        const plat = m.level === "PLATINUM" ? rr > 0.42 : rr > 0.78;
        const occurredAt = new Date(day);
        occurredAt.setHours(11 + Math.floor(rr * 11), Math.floor(seeded(n * 5.1) * 59));
        const status = back > 6 ? "DICAIRKAN" : back > 0 ? "TERVALIDASI" : "MENUNGGU_VALIDASI";
        voucherRows.push({
          employeeId: emp.id,
          category: plat ? "PLATINUM" : "SILVER",
          amount: plat ? 400_000 : 150_000,
          client: CLIENTS[Math.floor(seeded(n * 8.3) * CLIENTS.length)],
          status,
          occurredAt,
        });
      }
    }
  }
  await prisma.voucher.createMany({ data: voucherRows });

  const owner = await prisma.employee.findUniqueOrThrow({ where: { email: "owner@arcorp.id" } });
  const ekhy = byCode.get("AR-01")!;
  const dewi = byCode.get("AR-02")!;
  const sinta = byCode.get("AR-04")!;
  const fajar = byCode.get("AR-05")!;

  await prisma.kasbon.createMany({
    data: [
      {
        employeeId: ekhy.id, amount: 1_500_000,
        reason: "Biaya transport dan akomodasi klien Bandung 3 hari.",
        status: "MENUNGGU_OWNER", note: "Belum ditinjau",
        createdAt: new Date(now.getTime() - 864e5 * 2),
      },
      {
        employeeId: dewi.id, amount: 750_000,
        reason: "Perpanjangan STNK motor operasional.",
        status: "DISETUJUI", decidedById: owner.id, decidedAt: new Date(now.getTime() - 864e5 * 5),
        note: "Disetujui Owner · dipotong pencairan berikutnya",
        createdAt: new Date(now.getTime() - 864e5 * 6),
      },
      {
        employeeId: sinta.id, amount: 2_500_000,
        reason: "Renovasi rumah.",
        status: "DITOLAK", decidedById: owner.id, decidedAt: new Date(now.getTime() - 864e5 * 10),
        note: "Ditolak Owner · di luar kebutuhan operasional",
        createdAt: new Date(now.getTime() - 864e5 * 11),
      },
      {
        employeeId: fajar.id, amount: 1_000_000,
        reason: "Uang muka sewa kendaraan untuk event Surabaya.",
        status: "MENUNGGU_OWNER", note: "Belum ditinjau",
        createdAt: new Date(now.getTime() - 864e5 * 1),
      },
    ],
  });

  const chatSeed = (empId: string, msgs: { fromSupervisor: boolean; text: string; hh: number; mm: number }[]) =>
    msgs.map((m) => {
      const createdAt = new Date(now);
      createdAt.setHours(m.hh, m.mm, 0, 0);
      return {
        employeeId: empId,
        senderId: m.fromSupervisor ? supervisor.id : empId,
        fromSupervisor: m.fromSupervisor,
        text: m.text,
        createdAt,
      };
    });

  await prisma.chatMessage.createMany({
    data: [
      ...chatSeed(ekhy.id, [
        { fromSupervisor: true, hh: 7, mm: 40, text: "Selamat pagi Ekhy, hari ini prioritas kunjungan ke Kirana Lounge ya." },
        { fromSupervisor: false, hh: 8, mm: 14, text: "Siap Pak. Saya sudah absen dari Jakarta Selatan, langsung ke lokasi." },
        { fromSupervisor: false, hh: 13, mm: 26, text: "Kirana Lounge closing 1 paket Platinum. Voucher sudah saya input." },
        { fromSupervisor: true, hh: 13, mm: 31, text: "Bagus. Nanti kirim foto bukti serah terima ke grup." },
      ]),
      ...fieldEmployees
        .filter((e) => e.id !== supervisor.id && e.id !== ekhy.id)
        .flatMap((e) =>
          chatSeed(e.id, [
            { fromSupervisor: true, hh: 7, mm: 30, text: `Selamat pagi ${meta.get(e.code)!.name.split(" ")[0]}, tolong update absensi dan target hari ini ya.` },
          ])
        ),
    ],
  });

  console.log("Seed complete:");
  console.log(`  ${fieldEmployees.length} field employees (login with email or phone, then the OTP printed to this console)`);
  console.log(`  ${OFFICE_ACCOUNTS.length} office accounts: ${OFFICE_ACCOUNTS.map((a) => a.email).join(", ")}`);
  console.log(`  ${voucherRows.length} vouchers across 32 days`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
