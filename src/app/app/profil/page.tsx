import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Badge from "@/components/Badge";
import LogoutButton from "@/components/LogoutButton";
import { VOUCHER_LABEL, type EmployeeLevel } from "@/lib/constants";

export default async function ProfilPage() {
  const session = await getSession();
  const [employee, logins] = await Promise.all([
    prisma.employee.findUniqueOrThrow({
      where: { id: session!.employeeId },
      include: { supervisor: true },
    }),
    prisma.loginEvent.findMany({
      where: { employeeId: session!.employeeId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const mono = employee.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  const rows: { k: string; v: string }[] = [
    { k: "Kode karyawan", v: employee.code },
    { k: "Level", v: VOUCHER_LABEL[employee.level as EmployeeLevel] },
    { k: "Peran", v: employee.role },
    { k: "Email", v: employee.email },
    { k: "No. HP", v: employee.phone },
    { k: "Supervisor", v: employee.supervisor?.name ?? "—" },
  ];

  return (
    <div>
      <div className="flex items-center gap-4 py-3.5 pb-4.5">
        <span className="w-[62px] h-[62px] shrink-0 rounded-full border border-ar-goldline grid place-items-center font-display text-2xl text-ar-gold">
          {mono}
        </span>
        <span>
          <span className="block font-display text-2xl">{employee.name}</span>
          <span className="block text-[11px] tracking-[0.14em] uppercase text-ar-gold mt-1">
            {VOUCHER_LABEL[employee.level as EmployeeLevel]} · {employee.role}
          </span>
        </span>
      </div>

      <div className="bg-ar-surface border border-ar-line rounded-2xl px-4 py-1">
        {rows.map((r) => (
          <div key={r.k} className="flex justify-between gap-3 py-3.5 border-b border-ar-line last:border-b-0 text-[12.5px]">
            <span className="text-ar-dim">{r.k}</span>
            <span className="text-right">{r.v}</span>
          </div>
        ))}
      </div>

      <div className="text-[10px] tracking-[0.18em] uppercase text-ar-dim mt-5 mb-2.5">Riwayat login &amp; lokasi</div>
      <div className="flex flex-col gap-2">
        {logins.length === 0 && <div className="text-[12px] text-ar-faint py-3">Belum ada riwayat login.</div>}
        {logins.map((l) => (
          <div key={l.id} className="flex justify-between gap-2.5 items-center py-3 px-3.5 bg-ar-surface2 border border-ar-line rounded-xl">
            <span>
              <span className="block text-[12.5px]">{l.place ?? `${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}`}</span>
              <span className="block text-[10.5px] text-ar-dim mt-1">
                {l.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · {l.distanceKm} km
              </span>
            </span>
            <Badge status={l.inRadius ? "Dalam radius" : "Luar radius"} />
          </div>
        ))}
      </div>

      <LogoutButton
        label="Keluar & Absen Pulang"
        className="w-full mt-4.5 mb-1.5 py-3.5 bg-transparent border border-[rgba(228,117,107,.35)] rounded-xl text-ar-red text-[11px] font-semibold tracking-[0.16em] uppercase cursor-pointer"
      />
    </div>
  );
}
