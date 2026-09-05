import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OFFICE_ROLES, type AccessRole } from "@/lib/constants";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (OFFICE_ROLES.includes(session.accessRole as AccessRole)) redirect("/admin");
  redirect("/app");
}
