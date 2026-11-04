import { redirect } from "next/navigation";

// The in-app privacy policy was replaced by the Panduan Aplikasi page; old links keep working.
export default function PrivacyPage() {
  redirect("/panduan");
}
