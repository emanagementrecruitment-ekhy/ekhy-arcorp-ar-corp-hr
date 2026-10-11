import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OFFICE_ROLES, type AccessRole } from "@/lib/constants";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import SystemCenter from "@/components/admin/SystemCenter";
import ResetAppearance from "@/components/admin/ResetAppearance";
import OwnerIdentityPanel from "@/components/admin/OwnerIdentityPanel";
import PackagePanel from "@/components/admin/PackagePanel";

/**
 * Pusat Sistem (Owner only): license/about, system health + backup, release notes, audit log and help. The Owner identity,
 * package and reset-appearance panels from the old internal "Opsi menu" page live at the bottom.
 */
export default async function PusatSistemPage() {
  const session = await getSession();
  // Kepala Mess (SUPERVISOR) may open /admin but has no business here — the APIs would refuse them anyway.
  if (!session || !OFFICE_ROLES.includes(session.accessRole as AccessRole)) redirect("/admin");
  const isOwner = session.accessRole === "OWNER" || session.accessRole === "CONSULTANT";
  return (
    <div>
      <AdminPageHeader title="Pusat Sistem" subtitle="Lisensi, status sistem, pembaruan, riwayat aktivitas, dan bantuan" />
      {isOwner ? (
        <>
          <SystemCenter />
          <div className="mt-8 max-w-3xl">
            <div className="text-[10px] tracking-[0.16em] uppercase text-ar-gold mb-3">Pengaturan lisensi &amp; identitas</div>
            <OwnerIdentityPanel />
            <PackagePanel />
            <ResetAppearance />
          </div>
        </>
      ) : (
        <div className="mt-5.5 py-6 px-5 bg-ar-surface2 border border-ar-line rounded-2xl text-[12.5px] text-ar-dim">
          Halaman ini terkunci — hanya Owner yang bisa membukanya.
        </div>
      )}
    </div>
  );
}
