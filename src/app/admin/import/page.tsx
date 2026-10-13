import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OFFICE_ROLES, type AccessRole } from "@/lib/constants";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ImportHub from "@/components/admin/ImportHub";

/** Import Data: one place to download every fill-in template and upload the filled file. */
export default async function ImportPage() {
  const session = await getSession();
  if (!session || !OFFICE_ROLES.includes(session.accessRole as AccessRole)) redirect("/admin");
  return (
    <div>
      <AdminPageHeader title="Import Data" subtitle="Unduh template, isi di Excel, upload — data langsung masuk tanpa input satu per satu" />
      <ImportHub accessRole={session.accessRole} />
    </div>
  );
}
