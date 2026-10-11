import { redirect } from "next/navigation";

// The old internal "Opsi menu" page became the Pusat Sistem (/admin/sistem); keep old links working.
export default function NavLayoutRedirect() {
  redirect("/admin/sistem");
}
