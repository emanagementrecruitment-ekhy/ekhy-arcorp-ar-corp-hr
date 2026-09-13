# DEAR Management — Aplikasi Android (untuk Play Store)

Aplikasi Android ini adalah **Trusted Web Activity (TWA)** — pembungkus native
Android resmi dari Google untuk aplikasi web yang sudah ada. Semua fitur
(absensi GPS, voucher, kasbon, dsb) langsung terpakai dari web app yang sudah
live di Railway; tidak ada kode yang ditulis ulang.

Proyek build-nya (`twa-manifest.json` + workflow GitHub Actions) sudah
disiapkan di repo ini. Build sesungguhnya (kompilasi ke `.aab`/`.apk`) berjalan
otomatis di GitHub Actions setiap kali folder `android/` di-push — karena
proses build butuh Android SDK + koneksi internet penuh yang tidak tersedia
di lingkungan kerja saya.

## 1. Tambahkan 2 secret di GitHub (sekali saja)

Buka repo di GitHub → **Settings → Secrets and variables → Actions → New
repository secret**, lalu tambahkan:

| Nama secret | Isi |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Isi file `android-keystore-base64.txt` yang saya kirimkan terpisah (bukan lewat git, karena ini rahasia) |
| `ANDROID_KEYSTORE_PASSWORD` | Password dari file `keystore-credentials.txt` yang saya kirimkan terpisah |

**PENTING:** simpan file `android.keystore` dan `keystore-credentials.txt`
yang saya kirimkan ke Anda di tempat yang sangat aman (misalnya Google Drive
pribadi + salinan offline). File ini adalah identitas penandroid tanda
tangan aplikasi Anda — kalau hilang, Anda **tidak akan pernah bisa merilis
update aplikasi ini lagi** di Play Store (harus buat aplikasi baru dari nol
dengan semua rating/review/install count hilang).

## 2. Jalankan build

Build otomatis jalan setiap push ke folder `android/`. Untuk build manual:
GitHub repo → tab **Actions** → pilih workflow **Build Android App (TWA)** →
**Run workflow**.

## 3. Ambil hasilnya

Setelah build selesai (±5-10 menit), buka run tersebut di tab **Actions**,
scroll ke bagian **Artifacts**, unduh `dear-management-android-<nomor>.zip`.
Isinya:
- `app-release-bundle.aab` — **file yang diupload ke Play Console**
- `app-release-signed.apk` — untuk uji coba instal manual di HP Android

## 4. Buat akun Google Play Developer (dilakukan sendiri)

1. Buka https://play.google.com/console/signup
2. Login pakai akun Google (sebaiknya akun khusus bisnis, bukan pribadi)
3. Bayar biaya pendaftaran satu kali **USD 25**
4. Lengkapi identitas developer (perorangan atau organisasi/bisnis)

## 5. Buat aplikasi di Play Console & upload

1. Play Console → **Create app** → isi nama "DEAR Management", bahasa
   Indonesia, kategori Business/Productivity, gratis.
2. Lengkapi **Store listing**: deskripsi singkat & lengkap, screenshot
   aplikasi (ambil dari HP setelah instal APK di langkah 3), ikon (sudah ada
   di `public/icons/icon-512.png` di web app).
3. Isi **Privacy Policy URL** — wajib. Kalau belum ada, buat halaman
   sederhana (bisa saya bantu buatkan) dan taruh di `/privacy` pada web app.
4. Isi **Content rating questionnaire** (kuesioner rating konten).
5. Isi **Data safety** — jelaskan data yang dikumpulkan (lokasi GPS untuk
   absensi, data karyawan).
6. Masuk ke **Production → Create new release**, upload `app-release-bundle.aab`.
7. Submit untuk review. Biasanya butuh 1-7 hari kerja sampai disetujui Google.

## Update aplikasi di kemudian hari

Setiap kali web app berubah, aplikasi Android **tidak perlu di-build ulang**
kecuali Anda mengubah: nama aplikasi, ikon, warna, atau versi minimum
Android — karena TWA hanya membuka web app yang sama secara live. Kalau
salah satu dari itu berubah, naikkan `appVersionCode` dan `appVersion` di
`android/twa-manifest.json`, lalu push ulang.

## File `assetlinks.json`

`public/.well-known/assetlinks.json` di web app menghubungkan domain web
dengan aplikasi Android ini (supaya aplikasi tampil tanpa address bar
browser, benar-benar terasa seperti aplikasi native). Sudah otomatis
disiapkan dan cocok dengan sertifikat di `android.keystore` yang sama.

<!-- secrets configured, triggering build -->
