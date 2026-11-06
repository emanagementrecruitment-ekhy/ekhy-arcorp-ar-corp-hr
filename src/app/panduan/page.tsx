import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { COMPANY_EMAIL, COMPANY_NAME, COMPANY_WEBSITE_HOST, COMPANY_WEBSITE_URL } from "@/lib/constants";
import ProjectSimulation from "@/components/ProjectSimulation";
import WalletMenu from "@/components/WalletMenu";

export const metadata: Metadata = {
  title: `Panduan Aplikasi · ${BRAND.short}`,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="font-display text-[15px] text-ar-gold2 mb-2">{title}</div>
      {children}
    </section>
  );
}

const STEPS = [
  ["Masuk", "Ketik email atau nomor HP yang terdaftar, lalu masukkan kode 6 angka yang dikirim ke Anda. Login di ponsel bertahan sampai Anda menekan Logout."],
  ["Absen", "Buka halaman Absen di beranda lalu tekan tombol absen. Izinkan lokasi supaya absen tercatat di tempat kerja."],
  ["Voucher (VCR)", "Khusus Terapis: catat voucher komisi di menu Voucher. Jumlah dan nilainya otomatis masuk ke Slip Pay bulan itu."],
  ["Kasbon", "Ajukan kasbon dari menu Kasbon. Owner yang menyetujui, dan yang disetujui dipotong otomatis di Slip Pay."],
  ["Slip Pay", "Lihat dan unduh rincian gaji bulanan Anda sebagai PDF dari menu Payslip."],
  ["Lapor", "Ada kendala di lapangan? Kirim lewat menu Lapor, lengkap dengan catatan, supaya kantor bisa menindaklanjuti."],
] as const;

export default function PanduanPage() {
  return (
    <div className="min-h-screen bg-ar-bg text-ar-text">
      <div className="max-w-2xl mx-auto px-5 py-8 sm:py-12 flex flex-col gap-9">
        <div>
          <div className="font-display text-[22px] mb-1">Panduan Aplikasi</div>
          <div className="text-[11px] text-ar-dim">{BRAND.short} · Cara memakai, Angel, simulasi, dan dompet digital</div>
        </div>

        <Section title="1. Cara menggunakan aplikasi">
          <ol className="flex flex-col gap-2.5">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="flex gap-3 p-3 bg-ar-surface border border-ar-line rounded-xl text-[12.5px] leading-[1.6]">
                <span className="shrink-0 w-6 h-6 rounded-full bg-ar-goldfill text-ar-gold2 grid place-items-center text-[11px] font-bold">{i + 1}</span>
                <span>
                  <b className="text-ar-text">{t}.</b> <span className="text-ar-dim">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="2. Memakai asisten Angel">
          <div className="text-[12.5px] leading-[1.7] text-ar-dim flex flex-col gap-2">
            <p>
              Angel adalah asisten di dalam aplikasi. Tekan gambar Angel yang melayang di layar, lalu ketik pertanyaan atau pilih
              pertanyaan cepat.
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li>Tanya: &ldquo;Sudah absen belum?&rdquo;, &ldquo;Berapa VCR saya bulan ini?&rdquo;, &ldquo;Status kasbon saya?&rdquo;.</li>
              <li>Angel hanya membaca data Anda. Angel tidak menyetujui izin, gaji, atau kasbon.</li>
              <li>Angel bisa keliru, jadi periksa kembali angka penting di menu terkait.</li>
              <li>Pertanyaan yang tidak bisa dijawab bisa diteruskan ke kantor dengan tombol yang tersedia.</li>
            </ul>
          </div>
        </Section>

        <Section title="3. Simulasi project">
          <p className="text-[12.5px] leading-[1.7] text-ar-dim mb-3">
            Coba satu hari kerja dari awal sampai gaji. Ini hanya simulasi, tidak mengubah data apa pun.
          </p>
          <ProjectSimulation />
        </Section>

        <Section title="4. Dompet digital (e-wallet) · segera hadir">
          <p className="text-[12.5px] leading-[1.7] text-ar-dim mb-3">
            Dompet digital sedang disiapkan: terima gaji dan komisi langsung di aplikasi dan lihat saldonya kapan saja. Tampilan di
            bawah adalah rancangan menunya, memakai nama perusahaan kamu.
          </p>
          <WalletMenu label={BRAND.short} />
        </Section>

        <div className="ar-copyright-plate rounded-3xl border border-ar-goldline px-5 py-6 text-center">
          <div className="font-iso text-[18px] sm:text-[22px] leading-[1.2]" style={{ color: "#e9dfc3" }}>
            {COMPANY_NAME}
          </div>
          <div className="font-unique text-[9.5px] tracking-[0.24em] uppercase mt-2" style={{ color: "#d8c28a" }}>
            Terima kasih telah bekerja bersama kami
          </div>
          <div className="mt-4 flex flex-col gap-1 font-iso text-[12px]">
            <a href={COMPANY_WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4" style={{ color: "#f1d27a" }}>
              {COMPANY_WEBSITE_HOST}
            </a>
            <a href={`mailto:${COMPANY_EMAIL}`} className="underline underline-offset-4 break-all" style={{ color: "#f1d27a" }}>
              {COMPANY_EMAIL}
            </a>
          </div>
        </div>

        <Link href="/" className="text-center text-[11px] text-ar-dim underline underline-offset-4">
          Kembali
        </Link>
      </div>
    </div>
  );
}
