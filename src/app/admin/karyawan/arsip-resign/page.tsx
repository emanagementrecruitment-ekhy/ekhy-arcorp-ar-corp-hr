import { redirect } from "next/navigation";

export default function ArsipResignRedirect() {
  redirect("/admin/hr-office?tab=arsip");
}
