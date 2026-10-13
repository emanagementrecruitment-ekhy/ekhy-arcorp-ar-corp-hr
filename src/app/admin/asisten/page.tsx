import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OFFICE_ROLES, type AccessRole } from "@/lib/constants";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AssistantDashboard from "@/components/admin/AssistantDashboard";

/** Asisten Harian: automatic check-in and VCR reminders, with today's picture for the office. */
export default async function AsistenPage() {
  const session = await getSession();
  if (!session || !OFFICE_ROLES.includes(session.accessRole as AccessRole)) redirect("/admin");
  return (
    <div>
      <AdminPageHeader title="Asisten Harian" subtitle="Pengingat absen dan pengecekan total VCR berjalan otomatis" />
      <AssistantDashboard />
    </div>
  );
}
