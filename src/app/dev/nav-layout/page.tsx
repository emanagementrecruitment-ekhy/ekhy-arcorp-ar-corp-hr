import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { OFFICE_ROLES, type AccessRole } from "@/lib/constants";

const OPTIONS = [
  {
    title: "A · Tab Bawah",
    desc: "Lima menu tetap di bawah, selalu terlihat. Pola paling dikenal karyawan lapangan.",
    best: "Paling cepat dipelajari · shipped as default",
    shipped: true,
  },
  {
    title: "B · Hub Grid",
    desc: "Beranda jadi halaman utama berisi kartu menu besar. Tanpa bar tetap, layar terasa lega.",
    best: "Cocok untuk usia beragam & layar kecil",
    shipped: false,
  },
  {
    title: "C · Rail Samping",
    desc: "Menu vertikal di kiri, mirip aplikasi kasir. Konten tetap terlihat saat berpindah.",
    best: "Cocok jika nanti dipakai di tablet kantor",
    shipped: false,
  },
];

export default async function NavLayoutDevPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!OFFICE_ROLES.includes(session.accessRole as AccessRole)) redirect("/app");

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto">
      <Link href="/admin" className="text-[11px] text-ar-dim">
        ← Kembali ke dashboard
      </Link>
      <div className="font-display text-[28px] mt-3">Opsi menu · perbandingan</div>
      <p className="text-[12.5px] text-ar-dim leading-[1.7] mt-2 max-w-xl">
        Referensi internal dari desain awal. Aplikasi karyawan sekarang berjalan dengan{" "}
        <strong className="text-ar-gold">Tab Bawah</strong> sebagai navigasi tetap. Dua opsi lain disimpan di sini untuk
        peninjauan, tidak aktif untuk karyawan.
      </p>

      <div className="flex flex-col gap-3 mt-6">
        {OPTIONS.map((o) => (
          <div
            key={o.title}
            className={`p-4 rounded-2xl border ${o.shipped ? "bg-ar-goldfill border-ar-goldline" : "bg-ar-surface2 border-ar-line"}`}
          >
            <div className="flex justify-between gap-3 items-center">
              <span className="font-display text-[17px] text-ar-gold2">{o.title}</span>
              {o.shipped && (
                <span className="py-1 px-2.5 rounded-full text-[9.5px] tracking-[0.12em] uppercase bg-ar-goldline text-ar-gold2">
                  Aktif
                </span>
              )}
            </div>
            <div className="text-[11.5px] leading-[1.65] text-ar-dim mt-2">{o.desc}</div>
            <div className="text-[10.5px] leading-[1.6] text-ar-gold mt-1.5">{o.best}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
