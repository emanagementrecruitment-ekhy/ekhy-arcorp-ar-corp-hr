import { redirect } from "next/navigation";

// Kalender Pengingat now lives inside "Lokasi & Absensi" (tab Kalender).
export default function KalenderRedirect() {
  redirect("/admin/lokasi?tab=kalender");
}
