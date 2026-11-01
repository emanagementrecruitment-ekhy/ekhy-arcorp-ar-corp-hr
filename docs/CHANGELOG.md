# Changelog

Semua perubahan notable pada project ini akan didokumentasikan di file ini.

Format ini berdasarkan [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan project ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Angel untuk Karyawan/Tera kini bisa menjawab lebih lengkap tentang datanya sendiri: tanggal-tanggal absen bulan ini, ringkasan bulan lalu (hari hadir dan VCR), rincian Slip Pay (komponen tambah dan potongan), dan riwayat kasbon. Angel juga menolak (di server, bukan hanya lewat perintah ke AI) pertanyaan tentang orang lain: menyebut nama, kode, atau nama depan karyawan lain, atau menanyakan "semua karyawan", "teman saya", "siapa yang paling banyak VCR"; jawabannya mengarahkan ke tombol "Kirim ke kantor". Nama orang lain tidak pernah dikirim ke AI. Prompt AI diperketat agar tidak menjelaskan rumus Slip Pay atau hubungan kasbon dengan gaji.
- Keamanan: backup database kini terenkripsi (AES-256-GCM) dengan kata sandi yang diketik Owner saat mengunduh dan tidak disimpan di mana pun; tanpa kata sandi berkas tidak bisa dibuka. Unduhan plain dinonaktifkan. Backup juga memakai salinan database yang konsisten (VACUUM INTO) sehingga data terbaru yang masih di berkas WAL ikut tersimpan. Berkas dibuka kembali dengan `scripts/decrypt-backup.mjs` (lihat docs/BACKUP-TERENKRIPSI.md).
- Kebijakan Privasi ditulis ulang sebagai Pemberitahuan Data Pribadi sesuai UU No. 27 Tahun 2022 dan fitur yang benar-benar berjalan: data KTP (NIK, tempat dan tanggal lahir), foto profil, lokasi langsung (posisi dikirim sekitar tiap satu menit saat aplikasi terbuka; kalimat lama yang menyebut lokasi tidak dilacak terus-menerus dikoreksi), isi chat Lapor, token notifikasi, peran yang dapat mengakses (termasuk Manager), masa simpan, dan hak karyawan. Bagian Asisten Angel (AI) menyebut penyedia AI yang benar-benar dipakai klien (Cloudflare Workers AI, Anthropic Claude, atau tanpa AI), data yang ikut terkirim, dan bahwa lokasi server dapat di luar Indonesia.
- Tautan "Kebijakan Privasi & Data Pribadi" kini ada di bawah halaman login dan di menu Profil karyawan (sebelumnya halaman ini tidak tertaut di mana pun).
- Angel untuk Owner dan admin kini menjawab pembukuan: "total penggajian bulan ini" (angka yang sama dengan halaman Laporan Totalan, periode harian, mingguan, atau bulanan), "total VCR bulan ini", dan "total kasbon bulan ini", dihitung langsung dari data tanpa AI. Pertanyaan bebas lain dijawab AI gateway hanya dengan angka agregat (tanpa nama atau data per orang), dan pertanyaan tentang satu orang ("rincian Budi") tetap diproses di server.
- Angel admin: pesan "Maaf, saya belum paham ... kunci Claude ... Call Center" dihapus. Bila Angel tidak bisa menjawab, muncul tombol "Teruskan ke Owner/Admin" yang membunyikan notifikasi lonceng. Tombol yang sama dipakai di Angel karyawan.
- Sidebar admin di mode terang: ikon bulat di atas, logo di kartu akun, logo merek, dan ikon menu 3D kini tampil di atas dasar gelap sehingga terlihat dari atas sampai bawah (sebelumnya hilang karena mode campur warna hanya cocok untuk latar gelap). Mode gelap tidak berubah.
- Asisten AI diganti nama dari "Ara" menjadi "Angel", dengan potret 3D baru sebagai gambar bonekanya (menggantikan boneka gambar lama). Tombol "Kirim ke kantor" kini menandai pesan "Lewat asisten Angel". Gerakan boneka mengikuti keadaan: berdenyut saat berpikir, bergoyang pelan saat menjawab.
- Halaman login: tampilan baru bergaya render 3D dengan animasi: kartu seperti papan tebal yang condong mengikuti kursor dengan kilau yang menyapu, logo berputar pelan seperti benda di atas meja putar dengan bayangan lantai, bola-bola emas mengambang di belakang, dan tombol timbul yang menekan saat diklik. Semua gerakan berhenti otomatis bila perangkat memakai "kurangi gerakan".
- Tera di TRAVEL / CLASSIC T5: input pendapatan (VCR) kini terpisah menjadi kolom S dan D, sesuai Slip Pay, dengan rate masing-masing dan total otomatis. Tera di lokasi lain tetap memakai satu kolom Jumlah VCR.
- Profil karyawan: tombol "Keluar & Absen Pulang" di bawah dihapus (tombol Keluar di header tetap ada), tombol "Segarkan Tampilan" menjadi ikon di samping foto profil, dan blok "Riwayat login & lokasi" (data GPS) dihapus.
- Login: dua permintaan kode OTP yang berdekatan tidak lagi membuat kode dari email yang dibaca lebih dulu ditolak (3 kode aktif terbaru diterima). Kode OTP yang gagal terkirim tidak lagi ditulis ke log produksi.
- Keamanan: pustaka peta MapLibre GL naik ke 6.14 (menutup celah XSS pada pembersih HTML popup) dan pustaka email Nodemailer ke 10.2 (menutup celah DoS pada pembaca daftar alamat). Halaman Lokasi & Absensi dan pengiriman kode OTP/slip lewat email berjalan seperti biasa. Server kini membutuhkan Node.js 20 atau lebih baru.
- Keamanan: Next.js dinaikkan dari 16.3.4 ke 16.4.2, yang menutup kerentanan critical (eksekusi kode jarak jauh di pembuatan gambar `next/og`), SSRF pada optimasi gambar, dan keracunan cache. Slip Gaji/Rincian Totalan: input yang sedang diketik kembali ke nilai tersimpan saat karyawan atau bulan berganti, tanpa render ulang berantai. Tidak ada perubahan tampilan.
- Pusat Sistem: banner hak cipta menjadi akuarium — dua ikan koi emas besar mengelilingi banner, satu searah dan satu berlawanan arah jarum jam, dengan sirip yang mengibas menyesuaikan kecepatan renang, gelembung naik, dan cahaya air. Berhenti bergerak otomatis bila perangkat memakai "kurangi gerakan".
- Pusat Sistem: banner hak cipta "AR Corporation" kini bergerak (cahaya emas melayang, berkas cahaya lewat, bingkai berdenyut) dan memuat Alamat, Telepon, Email, dan Website perusahaan. Gerakan berhenti otomatis bila pengguna mengaktifkan "kurangi gerakan" di perangkatnya.
- Deskripsi resmi aplikasi (metadata situs dan manifest PWA/Android) menjadi "AR Corporation - Good Grip, Profesional, Trusted. Integrated HR System Management".
- Kontak resmi AR Corporation (website www.officialarcorporation.my.id dan email official.arcorporation@gmail.com) ditambahkan di Pusat Sistem, Kebijakan Privasi, dan jawaban Ara. Kebijakan Privasi tidak lagi memakai email pribadi.
- Ara (Claude): variabel opsional `ANTHROPIC_WORKSPACE_ID` untuk kunci API yang tidak terikat ke satu workspace Anthropic. Tanpa ini kunci seperti itu ditolak (HTTP 400) dan Ara jatuh ke jawaban berbasis aturan.

### Added
- Batas harian untuk pertanyaan bebas Ara ke Claude, supaya biaya ANTHROPIC_API_KEY terkendali: total seluruh aplikasi per hari (`ASSISTANT_AI_DAILY_LIMIT`, default 300, 0 = matikan Claude) dan per orang per hari (`ASSISTANT_AI_PER_USER_LIMIT`, default 20; kantor mendapat 3x lipat). Hanya pertanyaan yang benar-benar dikirim ke Claude yang dihitung; pertanyaan umum (absen, VCR, Slip Pay, kasbon) dijawab aturan dan tidak dihitung. Hitungan tersimpan di database sehingga tidak reset saat server restart dan tidak bisa dilampaui oleh permintaan bersamaan. Saat batas tercapai, Ara tetap menjawab pertanyaan umum dan memberi tahu bahwa pertanyaan bebas bisa dicoba lagi besok. Pemakaian hari ini tampil di halaman Asisten Harian.
- Menu baru "Import Data" (Owner, Konsultan, Admin Pusat, Manager): satu halaman untuk mengunduh template Excel siap isi dan mengupload file yang sudah diisi, sehingga data masuk otomatis tanpa input satu per satu. Tersedia untuk Karyawan & Tera baru, Absensi (daftar per tanggal atau laporan bulanan), Pendapatan VCR, Kasbon, dan Rincian Slip Pay. Sheet Data pada template baru sengaja kosong (contoh ada di sheet "Contoh & Panduan") sehingga template yang terupload apa adanya tidak memasukkan data palsu. Baris yang salah dilewati dengan alasan, dan upload ulang file yang sama aman (tidak dobel).
- Import Kasbon (Owner, Konsultan, Manager): kode karyawan, tanggal, nominal, alasan, status (kosong = menunggu Owner, DISETUJUI, DITOLAK), dan sudah ditransfer. Tanggal baris menentukan bulan Slip Pay tempat kasbon disetujui dipotong.
- Import Rincian Slip Pay: baris biaya/potongan/tambahan per karyawan (kode, bulan atau tanggal, keterangan, blok, qty, debit atau kredit, catatan). Total VCR dan kasbon disetujui tetap dihitung otomatis.
- Import Absensi kini bisa membaca laporan bulanan Excel kantor apa adanya (mis. LAPORAN ABSENSI/VCR BV): satu sheet per bulan, kolom NO/NAMA/LINK/GRADE lalu tanggal 1–31. Angka di tanggal (termasuk 0) ditandai hadir; huruf (O, M, P, S, I, titik) dan sel kosong diabaikan; angka VCR tidak ikut dicatat. Bulan dan tahun dibaca dari judul sheet, nama dicocokkan ke Data Karyawan/Tera (nama depan saja boleh, nama kembar dilaporkan), sheet DASHBOARD/PANDUAN dilewati, dan upload ulang aman (yang sudah ada dihitung "sudah tercatat"). Hasil menampilkan ringkasan per bulan dan daftar nama yang tidak ditemukan.
- Ara versi admin (Owner, Konsultan, Admin Pusat, Manager): boneka Ara juga melayang di semua halaman admin untuk membantu kerja kantor. Tanya "ringkasan hari ini", "siapa yang belum absen", "kasbon yang menunggu", atau "rincian <nama/kode>" dan Ara menampilkan absen, VCR, kasbon, serta total dan baris Slip Pay bulan itu, lengkap dengan tombol ke halaman terkait. Pertanyaan yang lebih bebas (mis. membandingkan dua Tera) dijawab Claude bila `ANTHROPIC_API_KEY` diisi, lewat alat baca-saja yang mengambil data operasional. Ara admin hanya membaca: tidak mengubah data, dan tidak pernah memuat NIK, nomor HP, email, alamat, tanggal lahir, maupun alasan kasbon yang diketik karyawan. Pertanyaan admin yang dikirim ke Claude tercatat di Riwayat Aktivitas.
- Asisten AI "Ara" untuk karyawan: boneka AR melayang di pojok layar aplikasi karyawan, tekan untuk mengobrol. Hybrid — pertanyaan umum (sudah absen belum, batas jam absen, total VCR, total Slip Pay, status/cara kasbon, pinalty) dijawab langsung dari data karyawan itu sendiri tanpa biaya dan tanpa data keluar server; pertanyaan bebas atau panjang dipahami oleh Claude bila `ANTHROPIC_API_KEY` diisi di server (model bisa diganti lewat `ASSISTANT_AI_MODEL`). Keinginan seperti izin, cuti, atau keluhan bisa diteruskan ke kantor dengan tombol "Kirim ke kantor" (masuk sebagai notifikasi Owner/Admin). Ara hanya melihat data si penanya, tidak bisa mengubah data apa pun, dibatasi 12 pesan per menit dan 80 per hari per karyawan, dan pertanyaan yang dikirim ke Claude tercatat di Riwayat Aktivitas.
- Menu baru "Asisten Harian" (Owner, Admin Pusat, Manager) — asisten otomatis berbasis aturan, tanpa layanan AI luar sehingga data karyawan tidak keluar dari server. Setiap hari (WIB): 08.00 pengingat absen ke yang belum absen, 11.15 pengingat terakhir sebelum batas absen (12.00 + toleransi 15 menit, pinalty Rp200.000 untuk karyawan), 12.30 laporan ke kantor siapa yang belum absen, 19.30 pengingat input VCR ke Tera yang sudah masuk tapi belum ada VCR, dan 21.00 laporan total VCR hari ini ke kantor beserta temuan (total kurang dari separuh rata-rata 7 hari, atau lonjakan tak wajar per Tera). Tiap tugas hanya jalan sekali per hari. Dashboard menampilkan yang sudah/belum absen, VCR hari ini/rata-rata/bulan ini, VCR per Tera, jadwal beserta statusnya, riwayat kerja asisten, tombol "Ingatkan sekarang", dan tombol Jeda/Nyalakan. Pengingat ke HP butuh karyawan mengaktifkan notifikasi dan kunci VAPID di server; dashboard menunjukkan siapa yang belum.

### Fixed
- Popup di peta Lokasi & Absensi kini terbaca jelas di Mode Malam maupun Siang (sebelumnya teks pucat di atas latar putih hampir tak terlihat); huruf lebih besar dan tebal, status "GPS langsung"/peringatan berwarna kontras, serta tombol Edit karyawan yang jelas.

### Fixed
- Deploy Railway gagal saat build karena font Google gagal diunduh. Font (Cormorant Garamond, Manrope, Playfair Display, Inter, Montserrat, Work Sans) kini disimpan di dalam proyek, sehingga build tidak lagi bergantung pada internet. Tampilan tidak berubah.

### Added
- Pusat Sistem (Owner): "Reset Data ke Nol". Dengan kode reset dari vendor dan ketikan RESET, semua Tera dan karyawan dihapus kecuali Grace (demo) beserta seluruh pendapatan, kasbon, absensi, chat, slip pay, tabungan, biaya rutin, arsip resign, notifikasi, dan pengingat. Akun Owner, tampilan, paket, dan Riwayat Aktivitas tetap; pemegang jabatan (Admin/Kepala Mess/Manager) dipertahankan kecuali dicentang untuk ikut dihapus. Tercatat di Riwayat Aktivitas.

### Fixed
- Karyawan yang diangkat menjadi Admin Pusat, Kepala Mess, atau Manager tidak lagi hilang dari Data Karyawan: tetap tampil di daftar, slip pay, Laporan Totalan (total gaji), Absensi Harian, rekap pendapatan, dan hitungan batas karyawan. Kepala Mess yang diangkat juga tetap bisa dipilih sebagai pengawas. Akun Owner/Konsultan tetap tidak masuk daftar karyawan.

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