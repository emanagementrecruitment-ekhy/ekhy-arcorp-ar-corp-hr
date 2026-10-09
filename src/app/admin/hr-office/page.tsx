import { getSession } from "@/lib/auth";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import HrOfficeTabs from "@/components/admin/HrOfficeTabs";

/**
 * HR & Office. Jabatan and the resigned-payslip archive moved here from their own sidebar entries.
 * Only OWNER/CONSULTANT/MANAGER may open it; the API routes underneath enforce the same check
 * independently (defense in depth).
 */
export default async function HrOfficePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const session = await getSession();
  const allowed =
    session?.accessRole === "OWNER" || session?.accessRole === "CONSULTANT" || session?.accessRole === "MANAGER";

  return (
    <div>
      <AdminPageHeader title="HR & Office" subtitle="Jabatan kantor dan arsip slip karyawan/Tera yang resign — hanya Owner/Manager" />
      {allowed ? (
        <HrOfficeTabs initialTab={tab === "arsip" ? "arsip" : "jabatan"} />
      ) : (
        <div className="mt-5.5 py-6 px-5 bg-ar-surface2 border border-ar-line rounded-2xl text-[12.5px] text-ar-dim">
          Halaman ini terkunci — hanya Owner/Manager yang bisa membukanya.
        </div>
      )}
    </div>
  );
}
