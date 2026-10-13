# Changelog

Semua perubahan notable pada project ini akan didokumentasikan di file ini.

Format ini berdasarkan [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan project ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Titik Kantor Pusat dipindah ke alamat office: Jl. Mangga Besar IX No.1 Blok B2, Pinangsia, Taman Sari, Jakarta Barat. Alamat tampil di popup peta; lokasi terdaftar karyawan yang masih memakai titik lama ikut dipindah. Radius absensi tetap 1.000 km.

### Fixed
- Peta Lokasi & Absensi: titik karyawan yang koordinatnya sama (mis. lokasi terdaftar di kantor pusat, belum ada GPS) tidak lagi menumpuk jadi satu titik "macet"; titik menyebar melingkar di sekitar lokasi aslinya dan tidak menutupi penanda Kantor pusat.

### Changed
- Pusat Sistem kini terkunci untuk selain Owner: tulisan kecil di bawah Keluar tetap ada, tetapi Manager dan Admin Pusat hanya melihat "Halaman ini terkunci"; API sistem, Riwayat Aktivitas, dan unduh backup hanya untuk Owner. Log tidak bisa dihapus siapa pun.

### Added
- Riwayat Aktivitas juga mencatat kegiatan karyawan/Tera: login, absen/check-in lokasi, chat laporan, pengajuan kasbon, input pendapatan sendiri, dan ganti foto profil; serta perubahan foto karyawan dan identitas Owner oleh kantor.
- Riwayat Aktivitas kini mencatat semua kegiatan Manager/Admin/Supervisor: login ke Office, chat Laporan Lapangan (cuplikan pesan), edit absensi dan jabatan, pengumuman, pengingat, pengaturan, tabungan, biaya rutin, tambah karyawan, impor data, kirim slip, dan upgrade lisensi.

### Changed
- Riwayat Aktivitas kini hanya bisa dilihat Owner (Manager dan peran lain tidak melihat kartunya, dan API menolaknya).

### Changed
- "Pusat Sistem" tidak lagi tampil sebagai menu utama; kembali menjadi tulisan kecil tersembunyi di bawah tombol Keluar (desktop dan menu HP).

### Added
- Menu baru "Pusat Sistem" (menggantikan tautan kecil "Nav layout preview (dev)"): Tentang & Lisensi (produk, versi, status lisensi, paket dan batas karyawan, Call Center 0881-02545-8888), Status Sistem (server, database, OTP email/WhatsApp, backup terakhir dan tombol unduh backup), Catatan Pembaruan, Riwayat Aktivitas, dan Bantuan per peran dengan tombol Hubungi Support (WhatsApp). Tulisan besar "AR Corporation" dengan efek emas bergerak.
- Riwayat Aktivitas (audit log, khusus Owner): mencatat perubahan data/gaji karyawan, penghapusan, resign, keputusan dan transfer kasbon, rincian slip pay, input pendapatan, dan unduh backup — siapa, apa, kapan.

### Changed
- Versi aplikasi menjadi 1.0.0; nama file backup menjadi arcorp-backup-<tanggal>.db. Halaman lama /dev/nav-layout kini mengarah ke Pusat Sistem; panel Identitas Owner, Paket, dan Reset Tampilan dipindah ke sana.

### Changed
- Tombol Screenshot dipindah dari pojok kanan bawah ke deretan atas, sejajar dengan tombol Segarkan dan Lonceng (tidak lagi tertutup pemberitahuan Railway).

### Fixed
- Screenshot: hasil tangkapan di Mode Siang kini berlatar terang (sebelumnya selalu berlatar malam); latar mengikuti tema yang sedang aktif.

### Changed
- Admin: ikon Segarkan, Screenshot, dan Lonceng diganti ikon garis modern (tanpa emoji); tombol Segarkan dipindah ke samping lonceng di bagian atas (sidebar desktop dan bar atas HP); kartu "Masuk sebagai" hanya menampilkan jabatan, teks akses dihapus.
- Karyawan/Tera: tidak ada lagi tulisan GPS di halaman login maupun di dalam aplikasi — langkah absensi saat login berjalan diam-diam lalu langsung masuk, dan indikator lokasi aktif hanya titik hijau kecil di pojok kanan atas.
- Mode Siang: warna teks dipertegas (lebih hitam) dan bobot huruf dinaikkan sedikit agar mudah dibaca.

### Fixed
- AR Corp Desktop: kalau Railway belum bisa dihubungi saat aplikasi dibuka, aplikasi mencoba 3x dulu, dan bila mode cadangan lokal juga gagal tampil halaman "menyambung ulang" yang otomatis masuk begitu server kembali (bukan kotak error di layar hitam).

### Changed
- Slip Pay Tera memakai format Excel "Rincian Payroll": kolom Debit/Kredit (Jumlah & Total), baris tetap (TOTAL VCR, ADMIN, MESS, PINALTY ABSEN, TEST RUTIN, SPEKULO, LOKER, SALON) dan blok KASBON UANG, AMBIL BARANG, TAMBAHAN DOKTER, POTONGAN LAIN dengan Jumlah Totalan berjalan. Tampilan layar, cetak, dan PDF sama.
- Kasbon Tera yang disetujui otomatis masuk satu per satu ke blok Kasbon Uang dan dipotong penuh bulan itu (cicilan karyawan diinput manual oleh Admin lewat "Masuk ke Blok: Kasbon Uang"); voucher yang masuk hari itu langsung menambah TOTAL VCR; rincian bertipe Ambil Barang / Tambahan Dokter / Potongan Lain otomatis masuk ke bloknya (pilih "Masuk ke Blok" di form rincian, atau tulis kata kuncinya di Rincian).

### Added
- Menu sidebar "Channel/Link" di grup Operasional · HR & Office: daftar channel/link tiap Tera dan Karyawan.

### Added
- Pencatat rute lambat: setiap permintaan yang lebih dari 500 ms ditulis ke log Railway sebagai `[slow] METHOD /path status ms` (tanpa query, file statis dilewati). Ambang bisa diubah lewat variabel `SLOW_REQUEST_MS`.

### Fixed
- Pindah antar menu admin terasa lebih cepat: layar rangka muncul seketika saat menu diklik, permintaan berulang (peran pengguna, lencana "aktif", daftar nama) dipakai ulang selama 20 detik sehingga permintaan per klik turun dari 44 menjadi 27 pada uji, dan logo merek di-cache 30 detik
- Aplikasi jauh lebih cepat: daftar dan dasbor admin tidak lagi ikut membaca foto profil (bisa 1–2 MB per orang) dari database. Pemilih nama (supervisor, kalender, slip pay, pendapatan) memakai daftar ringkas; foto baru dimuat saat form Edit dibuka. Uji 150 karyawan: total waktu server 8,5 dtk menjadi 0,5 dtk

### Added
- Menu "Gabungan Totalan" menjadi "Report Operasional & Payslip"; "Laporan Pendapatan" menjadi "Laporan Totalan"
- Laporan Totalan: tombol CSV diperkecil, ditambah Print; laporan dipisah Terapis dan Karyawan dengan ringkasan pengeluaran gaji per hari, minggu, dan bulan; CSV kini hanya total operasional (rincian voucher ada di Input Pendapatan)
- Input Pendapatan: tombol Upload DATA pindah ke kartu Tambah Entri sehingga lencana "aktif" kembali di ujung kanan
- Kasbon: dipisah tab Karyawan, Terapis, dan Channel/Link (Channel/Link aktif setelah daftarnya ditetapkan); Owner/Manager menyetujui, lalu Admin menandai "Sudah Ditransfer" (hanya bisa setelah disetujui)
- Akun demo Tera Grace kini memiliki NIK contoh (fiktif) agar kolom NIK terlihat; NIK yang diubah admin tidak ditimpa
- Lonceng notifikasi kantor kini ikut berbunyi saat pengumuman diganti dan saat Owner/Admin membuat pemberitahuan (pengingat) baru, selain saat karyawan/Tera login
- Halaman admin lebih ringan: lencana "N aktif" di atas halaman tidak lagi memuat seluruh data Ringkasan di setiap halaman
- Data Karyawan: kolom Jumlah VCR menjadi Gaji, CH/Link diganti Kasbon, dan kolom baru Bonus/Fee (rincian Slip Pay bulan ini yang bertuliskan bonus/fee); Total Pendapatan = Gaji + Bonus/Fee. Data Tera tetap memakai VCR dan CH/Link
- Data Karyawan/Tera: tanggal lahir di kolom Kontak diganti NIK (diisi di form Tambah/Edit, 16 digit); tabel dirapikan agar sejajar dan muat di layar
- Data Karyawan/Tera: kolom Outlet, Jumlah VCR, Presentase Hadir, CH/Link, dan Total Pendapatan; tombol Tambah/Import di baris tab Aktif/Resign; menandai Resign sekarang juga meminta kode Owner
- Lonceng notifikasi pindah ke samping logo di sidebar
- Server lebih ringan: lonceng notifikasi cek tiap 15 detik (sebelumnya 6 detik) dan berhenti saat tab tidak aktif
- Arsip Slip Resign dan hapus karyawan butuh kode sekali pakai yang dikirim ke email Owner saja; arsip terbuka 15 menit setelah kode benar
- Kode terapis (Tera) lama berawalan AR- otomatis diganti EQ- dengan nomor yang sama
- Data Karyawan/Tera: tombol "Tambah Staff" dan "Tambah Terapis" terpisah di kanan atas (Import dikecilkan di sebelahnya); kode Staff AR-xx, Terapis EQ-xx
- Menu "HR & Office" (Jabatan + Arsip Slip Resign) menggantikan item sidebar Tambah Karyawan, Jabatan, dan Arsip Slip Resign
- Kalender Pengingat digabung ke halaman "Lokasi & Absensi" (tab), pengumuman/teks berjalan pindah ke menu "Pengumuman" di sidebar
- Notifikasi server berbunyi saat ada akun yang login (termasuk karyawan biasa); bunyi aktif setelah klik pertama, dan otomatis di aplikasi desktop
- Absensi Harian: kotak absensi diwarnai lewat tombol warna (M merah, O kuning, J jingga, P hijau, S biru), dropdown bulan, baris huruf hari dengan Minggu hijau, dan tombol import massal yang lebih kecil
- Initial project setup dengan GitHub Actions workflows
- Branch protection rules untuk main branch
- Issue templates dan PR template
- Contributing guidelines
- License dan README documentation

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- Enabled commit signoff requirement
- Added security scanning workflow

## [0.1.0] - 2026-09-04

### Fixed
- Aplikasi jauh lebih cepat: daftar dan dasbor admin tidak lagi ikut membaca foto profil (bisa 1–2 MB per orang) dari database. Pemilih nama (supervisor, kalender, slip pay, pendapatan) memakai daftar ringkas; foto baru dimuat saat form Edit dibuka. Uji 150 karyawan: total waktu server 8,5 dtk menjadi 0,5 dtk

### Added
- Lonceng notifikasi kantor kini ikut berbunyi saat pengumuman diganti dan saat Owner/Admin membuat pemberitahuan (pengingat) baru, selain saat karyawan/Tera login
- Halaman admin lebih ringan: lencana "N aktif" di atas halaman tidak lagi memuat seluruh data Ringkasan di setiap halaman
- Data Karyawan: kolom Jumlah VCR menjadi Gaji, CH/Link diganti Kasbon, dan kolom baru Bonus/Fee (rincian Slip Pay bulan ini yang bertuliskan bonus/fee); Total Pendapatan = Gaji + Bonus/Fee. Data Tera tetap memakai VCR dan CH/Link
- Data Karyawan/Tera: tanggal lahir di kolom Kontak diganti NIK (diisi di form Tambah/Edit, 16 digit); tabel dirapikan agar sejajar dan muat di layar
- Initial repository setup
- Project structure dan documentation
- GitHub Actions CI/CD pipeline
- Security scanning workflow
- Issue dan PR templates
- Contributing guidelines

---

## Bagaimana Berkontribusi ke Changelog

Ketika membuat PR yang merubah behavior atau menambah features:

1. Tambahkan entry di section "[Unreleased]"
2. Gunakan categories: Added, Changed, Deprecated, Removed, Fixed, Security
3. Gunakan present tense: "Add feature" tidak "Added feature"
4. Referencde issue numbers jika applicable

### Example Entry

```markdown
### Fixed
- Aplikasi jauh lebih cepat: daftar dan dasbor admin tidak lagi ikut membaca foto profil (bisa 1–2 MB per orang) dari database. Pemilih nama (supervisor, kalender, slip pay, pendapatan) memakai daftar ringkas; foto baru dimuat saat form Edit dibuka. Uji 150 karyawan: total waktu server 8,5 dtk menjadi 0,5 dtk

### Added
- Lonceng notifikasi kantor kini ikut berbunyi saat pengumuman diganti dan saat Owner/Admin membuat pemberitahuan (pengingat) baru, selain saat karyawan/Tera login
- Halaman admin lebih ringan: lencana "N aktif" di atas halaman tidak lagi memuat seluruh data Ringkasan di setiap halaman
- Data Karyawan: kolom Jumlah VCR menjadi Gaji, CH/Link diganti Kasbon, dan kolom baru Bonus/Fee (rincian Slip Pay bulan ini yang bertuliskan bonus/fee); Total Pendapatan = Gaji + Bonus/Fee. Data Tera tetap memakai VCR dan CH/Link
- Data Karyawan/Tera: tanggal lahir di kolom Kontak diganti NIK (diisi di form Tambah/Edit, 16 digit); tabel dirapikan agar sejajar dan muat di layar
- New user authentication module (#123)
- Support untuk OAuth 2.0 (#124)

### Fixed
- Login form validation bug (#125)

### Security
- Updated vulnerable dependencies (#126)
```

## Format Guidelines

- Keep line length di bawah 80 characters
- Group related changes bersama
- Include issue/PR numbers dalam kurung
- Jangan gunakan istilah teknis yang kompleks