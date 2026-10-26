import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfilePhoto from "@/components/employee/ProfilePhoto";
import RefreshAppButton from "@/components/employee/RefreshAppButton";
import { VOUCHER_LABEL, usesVcr, type EmployeeLevel } from "@/lib/constants";
import { fmtRp, isLink } from "@/lib/format";

export default async function ProfilPage() {
  const session = await getSession();
  // EmployeeLayout already redirects on a missing session, but its check
  // doesn't re-run on every client-side navigation within /app — if the
  // session expires while the tab stays open, this page's own getSession()
  // call is what actually catches it.
  if (!session) redirect("/login");
  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: session.employeeId },
    include: { supervisor: true },
  });

  const mono = employee.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  const vcr = usesVcr(employee.role);
  const levelLabel = vcr ? VOUCHER_LABEL[employee.level as EmployeeLevel] : "GAJI";

  const rows: { k: string; v: string }[] = [
    { k: "Kode karyawan", v: employee.code },
    { k: "Pendapatan/VCR", v: levelLabel },
    ...(vcr ? [] : [{ k: "Nominal Gaji", v: fmtRp(employee.salary ?? 0) }]),
    { k: "Peran", v: employee.role },
    { k: "Email", v: employee.email },
    { k: "No. HP", v: employee.phone },
    { k: "Supervisor", v: employee.supervisor?.name ?? "—" },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 py-3.5 pb-4.5">
        <ProfilePhoto mono={mono} />
        <span className="flex-1 min-w-0">
          <span className="block font-display text-2xl">{employee.name}</span>
          <span className="block text-[11px] tracking-[0.14em] uppercase text-ar-gold mt-1">
            {levelLabel} · {employee.role}
          </span>
        </span>
        <RefreshAppButton iconOnly />
      </div>

      <div className="bg-ar-surface border border-ar-line rounded-2xl px-4 py-1">
        {rows.map((r) => (
          <div key={r.k} className="flex justify-between gap-3 py-3.5 border-b border-ar-line last:border-b-0 text-[12.5px]">
            <span className="text-ar-dim">{r.k}</span>
            <span className="text-right">
              {r.k === "Peran" && isLink(r.v) ? (
                <a href={r.v} target="_blank" rel="noopener noreferrer" className="text-ar-gold underline">
                  {r.v}
                </a>
              ) : (
                r.v
              )}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/app/payslip"
        className="flex items-center justify-between mt-4.5 p-4 bg-ar-surface border border-ar-goldline rounded-2xl"
      >
        <span className="text-[13px]">📄 Rincian Totalan (Slip Pay)</span>
        <span className="text-ar-gold text-[11px]">Lihat →</span>
      </Link>

      {session.accessRole === "SUPERVISOR" && (
        <Link
          href="/admin/lapor-lapangan"
          className="flex items-center justify-between mt-2.5 p-4 bg-ar-surface border border-ar-goldline rounded-2xl"
        >
          <span className="text-[13px]">🗂️ Tinjau Laporan Lapangan</span>
          <span className="text-ar-gold text-[11px]">Buka →</span>
        </Link>
      )}
    </div>
  );
}
