import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiError } from "@/lib/api-auth";
import { OFFICE_ROLES, HQ, ATTENDANCE_RADIUS_KM } from "@/lib/constants";
import { shortRp, dLabel, dayKey, timeLabel } from "@/lib/format";

export async function GET() {
  try {
    await requireSession(OFFICE_ROLES);

    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const start14 = new Date(now);
    start14.setDate(now.getDate() - 13);
    start14.setHours(0, 0, 0, 0);
    const start30 = new Date(now.getTime() - 29 * 864e5);

    const [employees, vouchers14, todayVouchers, monthVouchers, pendingKasbon, latestLoginPerEmployee] =
      await Promise.all([
        prisma.employee.findMany({ where: { accessRole: "KARYAWAN" } }),
        prisma.voucher.findMany({ where: { occurredAt: { gte: start14 } } }),
        prisma.voucher.findMany({ where: { occurredAt: { gte: startToday } } }),
        prisma.voucher.findMany({ where: { occurredAt: { gte: start30 } } }),
        prisma.kasbon.count({ where: { status: "MENUNGGU_OWNER" } }),
        prisma.loginEvent.findMany({
          include: { employee: true },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
      ]);

    // Most recent event per employee, for "who's currently in/out of radius".
    const seen = new Set<string>();
    const latestByEmployee = latestLoginPerEmployee.filter((e) => {
      if (seen.has(e.employeeId)) return false;
      seen.add(e.employeeId);
      return true;
    });
    const onlineCount = latestByEmployee.filter((e) => e.inRadius).length;

    const days: { key: string; label: string; sum: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({ key: dayKey(d), label: dLabel(d), sum: 0 });
    }
    const byKey = new Map(days.map((d) => [d.key, d]));
    for (const v of vouchers14) {
      const k = dayKey(v.occurredAt);
      const bucket = byKey.get(k);
      if (bucket) bucket.sum += v.amount;
    }
    const maxSum = Math.max(1, ...days.map((d) => d.sum));

    return NextResponse.json({
      clock: now.toISOString(),
      onlineCount,
      totalEmployees: employees.length,
      kpis: [
        {
          label: "Karyawan Dalam Radius",
          value: `${onlineCount}/${employees.length}`,
          sub: `dari ${employees.length} karyawan terdaftar`,
        },
        {
          label: "Voucher Hari Ini",
          value: shortRp(todayVouchers.reduce((s, v) => s + v.amount, 0)),
          sub: `${todayVouchers.length} voucher`,
        },
        {
          label: "Kasbon Menunggu",
          value: String(pendingKasbon),
          sub: "perlu keputusan Owner",
        },
        {
          label: "Pendapatan 30 Hari",
          value: shortRp(monthVouchers.reduce((s, v) => s + v.amount, 0)),
          sub: `${monthVouchers.length} voucher`,
        },
      ],
      loginFeed: latestLoginPerEmployee.slice(0, 8).map((e) => ({
        name: e.employee.name,
        mono: e.employee.name
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join(""),
        detail: `${e.place ?? `${e.lat.toFixed(3)}, ${e.lng.toFixed(3)}`} · ${e.distanceKm} km · ${timeLabel(e.createdAt)}`,
        status: e.inRadius ? "Dalam radius" : "Luar radius",
      })),
      bars: days.map((d) => ({ label: d.label, value: d.sum, heightPct: Math.max(3, (d.sum / maxSum) * 100) })),
      barsFrom: days[0]?.label ?? "",
      barsTo: days[days.length - 1]?.label ?? "",
      silverAll: vouchers14.filter((v) => v.category === "SILVER").length,
      platAll: vouchers14.filter((v) => v.category === "PLATINUM").length,
      hqLabel: `${HQ.lat.toFixed(4)}, ${HQ.lng.toFixed(4)} · radius ${ATTENDANCE_RADIUS_KM} km`,
    });
  } catch (e) {
    return apiError(e);
  }
}
