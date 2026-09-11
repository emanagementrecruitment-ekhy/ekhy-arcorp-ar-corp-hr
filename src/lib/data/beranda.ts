import "server-only";
import { prisma } from "@/lib/prisma";
import { fmtRp, dLabel, timeLabel } from "@/lib/format";
import { VOUCHER_LABEL, employeeRate, usesVcr, type EmployeeLevel } from "@/lib/constants";

function greetingFor(now: Date) {
  const hour = now.getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function nextPayoutLabel(now: Date) {
  const day = now.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const d = new Date(now.getTime() + daysUntilFriday * 864e5);
  return `Jumat, ${dLabel(d)}`;
}

export async function getBerandaData(employeeId: string) {
  const now = new Date();
  const [employee, vouchers, lastLogin] = await Promise.all([
    prisma.employee.findUniqueOrThrow({ where: { id: employeeId } }),
    prisma.voucher.findMany({ where: { employeeId } }),
    prisma.loginEvent.findFirst({ where: { employeeId }, orderBy: { createdAt: "desc" } }),
  ]);

  const vcr = usesVcr(employee.role);
  const myLevel = employee.level as EmployeeLevel;
  const myRate = vcr ? employeeRate(myLevel, employee.customRate) : 0;
  // Saldo belum dicairkan only ever counts vouchers still logged under the
  // employee's own current grade — a leftover voucher under a different
  // category (e.g. after a Peran/grade change) isn't re-valued at today's
  // rate, so it's excluded here rather than mixed into a single total.
  const unpaid = vouchers.filter((v) => v.status !== "DICAIRKAN" && v.category === myLevel);
  const feed = vouchers
    .slice()
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 5);

  return {
    usesVcr: vcr,
    greeting: greetingFor(now),
    meName: employee.name,
    meLevel: vcr ? VOUCHER_LABEL[myLevel] : "GAJI",
    meCode: employee.code,
    checkInTime: lastLogin ? timeLabel(lastLogin.createdAt) : "—",
    myPlace: lastLogin?.place ?? employee.homePlace,
    myDistanceKm: lastLogin?.distanceKm ?? null,
    inRadius: lastLogin?.inRadius ?? false,
    myCoord: lastLogin ? `${lastLogin.lat.toFixed(4)}, ${lastLogin.lng.toFixed(4)}` : "—",
    salary: fmtRp(employee.salary ?? 0),
    saldoTotal: fmtRp(unpaid.length * myRate),
    saldoCount: unpaid.length,
    myRateLabel: fmtRp(myRate),
    nextPayout: nextPayoutLabel(now),
    feed: feed.map((v) => ({
      title: v.client,
      meta: `${VOUCHER_LABEL[v.category as EmployeeLevel]} · ${dLabel(v.occurredAt)} ${timeLabel(v.occurredAt)}`,
      amount: v.category === "PLATINUM" ? "+400rb" : "+150rb",
    })),
  };
}
