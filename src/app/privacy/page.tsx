import { BRAND } from "@/lib/brand";
import type { Metadata } from "next";
import { COMPANY_EMAIL, COMPANY_NAME, COMPANY_WEBSITE_HOST, COMPANY_WEBSITE_URL } from "@/lib/constants";
import { aiProvider } from "@/lib/ai-gateway";
import { aiDisclosure } from "@/lib/privacy-notice";

export const metadata: Metadata = {
  title: `Kebijakan Privasi · ${BRAND.short}`,
};

// The AI section names the provider this client really uses (set in its server environment), so it is read per request.
export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="font-display text-[17px] text-ar-gold2 mb-2">{title}</div>
      {children}
    </section>
  );
}

export default function PrivacyPage() {
  const ai = aiDisclosure(aiProvider());
  return (
    <div className="min-h-screen bg-ar-bg text-ar-text">
      <div className="max-w-2xl mx-auto px-5 py-12 sm:py-16">
        <div className="font-display text-[28px] mb-1">Kebijakan Privasi &amp; Pemberitahuan Data Pribadi</div>
        <div className="text-[11.5px] text-ar-dim mb-8">{BRAND.short} · Terakhir diperbarui: November 2026</div>

        <div className="flex flex-col gap-6 text-[13px] leading-[1.8] text-ar-text">
          <p>
            Aplikasi {BRAND.short} (&ldquo;Aplikasi&rdquo;) adalah sistem internal untuk mengelola absensi, komisi/voucher,
            kasbon, dan Slip Pay karyawan {BRAND.short}. Aplikasi ini digunakan oleh karyawan dan staf kantor {BRAND.short} —
            bukan untuk umum. Halaman ini memberi tahu Anda, sebagai pemilik data pribadi, data apa yang kami proses, untuk
            apa, siapa yang dapat mengaksesnya, berapa lama disimpan, dan apa hak Anda, sesuai Undang-Undang No. 27 Tahun
            2022 tentang Pelindungan Data Pribadi.
          </p>

          <Section title="Data yang Kami Proses">
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>
                <strong>Identitas</strong> — nama, kode karyawan, jabatan, alamat email, dan nomor WhatsApp/telepon yang
                didaftarkan admin/pusat {BRAND.short} untuk login dan penggajian.
              </li>
              <li>
                <strong>Data KTP, bila diisi</strong> — NIK, tempat lahir, dan tanggal lahir, yang diisi saat pendaftaran
                karyawan atau Tera.
              </li>
              <li>
                <strong>Foto profil</strong> — bila Anda mengunggahnya.
              </li>
              <li>
                <strong>Absensi</strong> — catatan absen beserta lokasi GPS pada saat Anda absen, untuk memeriksa apakah Anda
                berada dalam radius lokasi kerja.
              </li>
              <li>
                <strong>Data pekerjaan</strong> — riwayat voucher/komisi (VCR), pengajuan kasbon, dan rincian Slip Pay.
              </li>
              <li>
                <strong>Pesan</strong> — isi pesan Anda di menu Lapor, termasuk pesan yang diteruskan dari asisten Angel
                ke kantor.
              </li>
              <li>
                <strong>Token notifikasi</strong> — bila Anda mengaktifkan notifikasi di perangkat.
              </li>
            </ul>
          </Section>

          <Section title="Lokasi Anda">
            <p>
              Selain saat absen, selama aplikasi terbuka dan terlihat di layar, aplikasi mengirim posisi perangkat Anda ke kantor
              pusat sekitar setiap satu menit (lokasi langsung). Titik hijau kecil di layar menandakan fitur ini aktif.
              Fitur ini tidak berjalan ketika aplikasi ditutup atau layar mati, dan koordinat tidak ditampilkan kepada Anda.
              Anda dapat menolak izin lokasi di pengaturan perangkat; hubungi admin bila hal itu mempengaruhi absensi Anda.
            </p>
          </Section>

          <Section title="Untuk Apa Data Digunakan">
            <p>
              Semata-mata untuk pelaksanaan hubungan kerja di {BRAND.short}: verifikasi kehadiran, perhitungan komisi/gaji,
              persetujuan kasbon, komunikasi kerja, dan pelaporan kepada manajemen, serta untuk memenuhi kewajiban hukum yang
              berlaku. Data tidak dijual dan tidak dipakai untuk iklan.
            </p>
          </Section>

          <Section title="Asisten Angel (AI)">
            <p>
              Angel adalah asisten di dalam aplikasi. Pertanyaan umum (sudah absen belum, batas jam absen, total VCR, status
              kasbon, dan sejenisnya) dijawab otomatis di server kami tanpa AI. {ai.employee}
            </p>
            <p className="mt-2">{ai.office}</p>
            {ai.vendor && <p className="mt-2">{ai.handling}</p>}
            <p className="mt-2">
              Angel tidak menyetujui izin, cuti, gaji, atau kasbon; keputusan tetap pada Owner/Admin. Angel bisa keliru,
              jadi periksa kembali angka penting di menu terkait. Mohon jangan menulis data sensitif (misalnya kesehatan)
              atau nama orang lain di chat Angel. Pertanyaan yang tidak dapat dijawab Angel dapat diteruskan ke kantor
              dengan tombol yang tersedia.
            </p>
          </Section>

          <Section title="Pihak Ketiga">
            <p>
              Kode verifikasi login (OTP) dikirim melalui layanan WhatsApp gateway (Fonnte) dan/atau email (Brevo). Layanan
              ini hanya menerima nomor/email tujuan dan kode OTP untuk keperluan pengiriman pesan.
              {ai.vendor ? ` Untuk Angel, penyedia AI yang dipakai adalah ${ai.vendor} (lihat bagian Asisten Angel).` : ""}
            </p>
          </Section>

          <Section title="Siapa yang Dapat Mengakses">
            <p>
              Akses ke data karyawan dibatasi pada peran yang memerlukannya untuk tugasnya: Owner, Manager, Admin Pusat, dan
              Kepala Mess (dan konsultan resmi {BRAND.short} bila ditunjuk), sesuai kewenangan masing-masing. Setiap
              pengguna hanya melihat data dirinya sendiri di aplikasi karyawan.
            </p>
          </Section>

          <Section title="Penyimpanan, Masa Simpan &amp; Keamanan">
            <p>
              Data disimpan pada server aplikasi {BRAND.short} dan dilindungi dengan otentikasi kode OTP serta pembatasan
              akses berdasarkan peran. Data disimpan selama hubungan kerja berlangsung dan setelahnya hanya selama
              diperlukan untuk kewajiban ketenagakerjaan, perpajakan, dan hukum lain yang berlaku.
            </p>
          </Section>

          <Section title="Hak Anda">
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>Mengetahui dan mengakses data pribadi Anda yang kami proses, termasuk salinannya.</li>
              <li>Meminta koreksi bila data tidak benar atau tidak lengkap.</li>
              <li>Meminta penghapusan data, sepanjang tidak bertentangan dengan kewajiban hukum untuk menyimpannya.</li>
              <li>Menarik persetujuan yang pernah Anda berikan (misalnya foto profil atau notifikasi).</li>
              <li>Mengajukan keberatan atas pemrosesan otomatis, termasuk jawaban Angel.</li>
            </ul>
            <p className="mt-2">
              Ajukan melalui menu Lapor di aplikasi atau kontak di bawah. Kami akan menanggapi secepatnya.
            </p>
          </Section>

          <Section title="Kontak">
            <p>
              Pertanyaan seputar kebijakan ini dapat disampaikan ke {COMPANY_NAME} melalui email{" "}
              <a href={`mailto:${COMPANY_EMAIL}`} className="text-ar-gold">
                {COMPANY_EMAIL}
              </a>{" "}
              atau website{" "}
              <a href={COMPANY_WEBSITE_URL} target="_blank" rel="noopener noreferrer" className="text-ar-gold">
                {COMPANY_WEBSITE_HOST}
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
