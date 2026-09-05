import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OFFICE_ROLES, type AccessRole } from "@/lib/constants";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!OFFICE_ROLES.includes(session.accessRole as AccessRole)) redirect("/app");

  const roleLabel =
    session.accessRole === "OWNER"
      ? "Owner AR Corp"
      : session.accessRole === "CONSULTANT"
        ? "Consultant AR Corp"
        : "Admin Pusat AR Corp";

  return (
    <div className="min-h-screen flex">
      <AdminSidebar roleLabel={roleLabel} canApprove={session.accessRole === "OWNER"} />
      <div className="arScroll flex-1 min-w-0 overflow-y-auto px-6 sm:px-8 py-6 pb-16">{children}</div>
    </div>
  );
}
