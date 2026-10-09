import { redirect } from "next/navigation";

// Adding people now happens from the buttons on Data Karyawan (Staff) and Data Tera (Terapis).
export default function TambahRedirect() {
  redirect("/admin/karyawan");
}
