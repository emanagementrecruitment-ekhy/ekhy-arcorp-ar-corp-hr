import "server-only";
import { prisma } from "./prisma";
import { usesVcr } from "./constants";
import { monthRange } from "./period";

const KASBON_TEXT = /kasbon/;

function ymOf(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }).slice(0, 7);
}

function nextYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function prevYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/**
 * Kasbon (loan) still unreturned at the end of the previous month — it lands on this month's Slip Pay
 * automatically as "SISA KASBON <bulan>". Walks the employee's history month by month:
 *  - Tera: an approved kasbon is deducted the month it is taken; whatever the month's pay could not cover
 *    (deductions beyond earnings) stays owed.
 *  - Karyawan: instalments are typed on the slip; an approved kasbon not covered by instalments that month
 *    stays owed, and so does any instalment/carry the pay could not cover.
 * Each month's carry is deducted from that month's pay first (capped at what the pay can cover).
 */
export async function computeKasbonCarry(employee: { id: string; role: string; salary: number | null }, month: string): Promise<number> {
  const isTera = usesVcr(employee.role);
  const { start } = monthRange(month);
  const [kasbons, items, vouchers] = await Promise.all([
    prisma.kasbon.findMany({ where: { employeeId: employee.id, status: "DISETUJUI", createdAt: { lt: start } }, select: { amount: true, createdAt: true } }),
    prisma.payslipItem.findMany({ where: { employeeId: employee.id, month: { lt: month } }, select: { month: true, category: true, description: true, debit: true, credit: true } }),
    isTera ? prisma.voucher.findMany({ where: { employeeId: employee.id, occurredAt: { lt: start } }, select: { amount: true, occurredAt: true } }) : Promise.resolve([]),
  ]);

  const isKasbonItem = (i: { category: string | null; description: string; credit: number }) =>
    i.credit > 0 && KASBON_TEXT.test(`${i.category ?? ""} ${i.description}`.toLowerCase());

  const months = [
    ...kasbons.map((k) => ymOf(k.createdAt)),
    ...items.filter(isKasbonItem).map((i) => i.month),
  ];
  if (months.length === 0) return 0;
  let m = months.sort()[0];
  const stop = month; // exclusive
  let carry = 0;
  for (let guard = 0; m < stop && guard < 48; guard++, m = nextYm(m)) {
    const approved = kasbons.filter((k) => ymOf(k.createdAt) === m).reduce((s, k) => s + k.amount, 0);
    const mine = items.filter((i) => i.month === m);
    const typed = mine.filter(isKasbonItem).reduce((s, i) => s + i.credit, 0);
    const otherCredits = mine.filter((i) => i.credit > 0 && !isKasbonItem(i)).reduce((s, i) => s + i.credit, 0);
    const debits = mine.reduce((s, i) => s + i.debit, 0);
    const base = isTera ? vouchers.filter((v) => ymOf(v.occurredAt) === m).reduce((s, v) => s + v.amount, 0) : employee.salary ?? 0;
    const net = base + debits - otherCredits;
    const due = carry + typed + (isTera ? approved : 0);
    const paid = Math.min(due, Math.max(0, net));
    carry = due - paid + (isTera ? 0 : Math.max(0, approved - typed));
  }
  return Math.max(0, Math.round(carry));
}