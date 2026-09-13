import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi · DEAR Management",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ar-bg text-ar-text">
      <div className="max-w-2xl mx-auto px-5 py-12 sm:py-16">
        <div className="font-display text-[28px] mb-1">Kebijakan Privasi</div>
        <div className="text-[11.5px] text-ar-dim mb-8">DEAR Management · Terakhir diperbarui: September 2026</div>

        <div className="flex flex-col gap-6 text-[13px] leading-[1.8] text-ar-text">
          <p>
            Aplikasi DEAR Management (&ldquo;Aplikasi&rdquo;) adalah sistem internal untuk mengelola absensi, komisi/voucher, dan
            kasbon karyawan DEAR Management. Aplikasi ini digunakan oleh karyawan dan staf kantor DEAR Management —
            bukan untuk umum. Halaman ini menjelaskan data apa yang dikumpulkan Aplikasi dan bagaimana data itu
            digunakan.
          </p>

          <section>
            <div className="font-display text-[17px] text-ar-gold2 mb-2">Data yang Dikumpulkan</div>
            <ul className="list-disc pl-5 flex flex-col gap-1.5">
              <li>
                <strong>Data identitas karyawan</strong> — nama, kode karyawan, jabatan, alamat email, dan nomor
                WhatsApp/telepon, yang didaftarkan oleh admin/pusat DEAR Management untuk keperluan login dan
                penggajian.
              </li>
              <li>
                <strong>Lokasi GPS</strong> — dikumpulkan hanya pada saat karyawan melakukan absensi masuk, untuk
                memverifikasi apakah karyawan berada dalam radius lokasi kerja yang ditentukan. Lokasi tidak dilacak
                secara terus-menerus di luar momen absensi.
              </li>
              <li>
                <strong>Data pekerjaan</strong> — riwayat voucher/komisi, pengajuan kasbon, dan catatan absensi, yang
                dicatat sebagai bagian dari fungsi normal Aplikasi.
              </li>
            </ul>
          </section>

          <section>
            <div className="font-display text-[17px] text-ar-gold2 mb-2">Bagaimana Data Digunakan</div>
            <p>
              Data di atas digunakan semata-mata untuk operasional internal DEAR Management: verifikasi kehadiran,
              perhitungan komisi/gaji, persetujuan kasbon, dan pelaporan kepada manajemen. Data tidak dijual atau
              dibagikan kepada pihak ketiga untuk kepentingan iklan.
            </p>
          </section>

          <section>
            <div className="font-display text-[17px] text-ar-gold2 mb-2">Pihak Ketiga</div>
            <p>
              Kode verifikasi login (OTP) dikirim melalui layanan WhatsApp gateway (Fonnte) dan/atau email (Brevo).
              Layanan ini hanya menerima nomor/email tujuan dan kode OTP untuk keperluan pengiriman pesan — tidak
              menerima data karyawan lainnya.
            </p>
          </section>

          <section>
            <div className="font-display text-[17px] text-ar-gold2 mb-2">Penyimpanan &amp; Keamanan</div>
            <p>
              Data disimpan pada server milik DEAR Management dan dilindungi dengan otentikasi berbasis kode OTP.
              Akses ke data karyawan dibatasi hanya untuk peran Owner, Admin Pusat, Konsultan, dan Kepala Mess sesuai
              kebutuhan operasional masing-masing.
            </p>
          </section>

          <section>
            <div className="font-display text-[17px] text-ar-gold2 mb-2">Hak Karyawan</div>
            <p>
              Karyawan dapat meminta koreksi atau penghapusan data pribadinya dengan menghubungi admin/pusat DEAR
              Management melalui kontak di bawah.
            </p>
          </section>

          <section>
            <div className="font-display text-[17px] text-ar-gold2 mb-2">Kontak</div>
            <p>
              Pertanyaan seputar kebijakan privasi ini dapat disampaikan ke{" "}
              <a href="mailto:aldhilarizky@gmail.com" className="text-ar-gold">
                aldhilarizky@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
