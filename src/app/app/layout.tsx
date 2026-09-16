import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AppHeader from "@/components/employee/AppHeader";
import BottomNav from "@/components/employee/BottomNav";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  // SUPERVISOR (Kepala Mess) keeps their own Slip Pay/absensi like any other
  // employee, in addition to reviewing Laporan Lapangan under /admin — see
  // /admin/jabatan, which only ever changes accessRole, never the rest of
  // their Employee row (salary, homePlace, etc).
  if (session.accessRole !== "KARYAWAN" && session.accessRole !== "SUPERVISOR") redirect("/admin");

  return (
    <div className="min-h-screen ar-glow flex flex-col">
      <AppHeader name={session.name} code={session.code} />
      <main className="flex-1 max-w-[720px] w-full mx-auto px-4 sm:px-5 pb-28 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}
