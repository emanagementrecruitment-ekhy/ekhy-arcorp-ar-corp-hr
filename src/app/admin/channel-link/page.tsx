import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ChannelLinkList from "@/components/admin/ChannelLinkList";

/** Daftar Channel/Link tiap Tera & Karyawan (diisi lewat Edit di Data Tera / Data Karyawan). */
export default function ChannelLinkPage() {
  return (
    <div>
      <AdminPageHeader title="Channel/Link" subtitle="Channel atau link tiap Tera dan Karyawan — ubah lewat tombol Edit di Data Tera / Data Karyawan" />
      <ChannelLinkList />
    </div>
  );
}
