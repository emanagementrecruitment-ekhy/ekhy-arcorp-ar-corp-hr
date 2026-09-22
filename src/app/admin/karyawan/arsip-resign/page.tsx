import { getSession } from "@/lib/auth";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ResignPayslipArchive from "@/components/admin/ResignPayslipArchive";

/**
 * Locked archive of resigned employees'/Tera's last Slip Pay — deliberately
 * gated tighter than the rest of /admin (which layout.tsx already opens to
 * ADMIN_PUSAT): only OWNER/CONSULTANT/MANAGER may see this page's content at
 * all, per the "folder terkunci" requirement. The API routes underneath enforce
 * the same check independently, so this is defense in depth, not the only
 * gate.
 */
export default async function ArsipResignPage() {
  const session = await getSession();
  const allowed =
    session?.accessRole === "OWNER" || session?.accessRole === "CONSULTANT" || session?.accessRole === "MANAGER";

  return (
    <div>
      <AdminPageHeader
        title="Arsip Slip Resign"
        subtitle="Slip Pay bulan terakhir karyawan/Tera yang resign — terkunci, hanya Owner/Manager yang bisa membuka"
      />
      {allowed ? (
        <div className="pt-5.5">
          <ResignPayslipArchive />
        </div>
      ) : (
        <div className="mt-5.5 py-6 px-5 bg-ar-surface2 border border-ar-line rounded-2xl text-[12.5px] text-ar-dim">
          Halaman ini terkunci — hanya Owner/Manager yang bisa membuka arsip Slip Pay karyawan/Tera yang resign.
        </div>
      )}
    </div>
  );
}
