import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OFFICE_ROLES, type AccessRole } from "@/lib/constants";

// No separate front page: signed-in people go straight to their area, everyone else to the login screen
// (which carries the app download links and the Panduan link).
export default async function Home() {
  const session = await getSession();
  if (session) {
    if (OFFICE_ROLES.includes(session.accessRole as AccessRole)) redirect("/admin");
    redirect("/app");
  }
  redirect("/login");
}
