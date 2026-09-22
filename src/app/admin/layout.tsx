import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OFFICE_ROLES, type AccessRole } from "@/lib/constants";
import AdminSidebar from "@/components/admin/AdminSidebar";
import OwnerWelcomeOverlay from "@/components/admin/OwnerWelcomeOverlay";
import DesktopStatusBar from "@/components/DesktopStatusBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const isSupervisor = session.accessRole === "SUPERVISOR";
  if (!OFFICE_ROLES.includes(session.accessRole as AccessRole) && !isSupervisor) redirect("/app");

  // CONSULTANT is the vendor's own reserved support tier — shown identically
  // to "Owner" here so it never surfaces as a distinct role a client would
  // have to explain (not every client engagement has a Consultant).
  const roleLabel =
    session.accessRole === "OWNER" || session.accessRole === "CONSULTANT"
      ? "Owner AR Corp"
      : session.accessRole === "MANAGER"
        ? "Manager AR Corp"
        : isSupervisor
          ? "Kepala Mess AR Corp"
          : "Admin Pusat AR Corp";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AdminSidebar
        roleLabel={roleLabel}
        canApprove={session.accessRole === "OWNER" || session.accessRole === "CONSULTANT" || session.accessRole === "MANAGER"}
        accessRole={session.accessRole}
        supervisorOnly={isSupervisor}
      />
      <div className="arScroll flex-1 min-w-0 overflow-y-auto px-4 sm:px-8 py-5 sm:py-6 pb-16">{children}</div>
      {session.accessRole === "OWNER" && <OwnerWelcomeOverlay />}
      <DesktopStatusBar />
    </div>
  );
}
