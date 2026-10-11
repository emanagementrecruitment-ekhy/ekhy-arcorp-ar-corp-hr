import { getSession } from "@/lib/auth";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import SystemCenter from "@/components/admin/SystemCenter";
import ResetAppearance from "@/components/admin/ResetAppearance";
import OwnerIdentityPanel from "@/components/admin/OwnerIdentityPanel";
import PackagePanel from "@/components/admin/PackagePanel";

/**
 * Pusat Sistem: license/about, system health + backup, release notes, audit log and help. The Owner identity,
 * package and reset-appearance panels from the old internal "Opsi menu" page live at the bottom.
 */
export default async function PusatSistemPage() {
  const session = await getSession();
  const role = session?.accessRole ?? "";
  return (
    <div>
      <AdminPageHeader title="Pusat Sistem" subtitle="Lisensi, status sistem, pembaruan, riwayat aktivitas, dan bantuan" />
      <SystemCenter />
      <div className="mt-8 max-w-3xl">
        <div className="text-[10px] tracking-[0.16em] uppercase text-ar-gold mb-3">Pengaturan lisensi &amp; identitas</div>
        {/* Manager is equal to Owner everywhere except this — see IDENTITY_VIEWERS in /api/admin/owner-identity. */}
        {role !== "MANAGER" && <OwnerIdentityPanel />}
        <PackagePanel />
        <ResetAppearance />
      </div>
    </div>
  );
}
