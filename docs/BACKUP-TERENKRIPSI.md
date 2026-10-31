# Backup database terenkripsi

Backup database kini selalu **dikunci dengan kata sandi yang Anda ketik sendiri** saat mengunduh. Kata sandi itu
tidak disimpan di server, di database, atau di log mana pun. Siapa pun yang memegang berkasnya tanpa kata sandi
tidak bisa membacanya.

> **Jika kata sandi hilang, backup tidak bisa dibuka oleh siapa pun, termasuk pembuat aplikasi.** Simpan kata sandi di
> tempat yang aman dan terpisah dari berkas backup (misalnya pengelola kata sandi).

## Mengunduh
1. Masuk sebagai Owner, buka **Pusat Sistem** (atau **Pengaturan Tampilan → Cadangkan Data**).
2. Klik **Unduh backup terenkripsi**.
3. Ketik kata sandi (minimal 12 karakter) dua kali, lalu klik **Unduh**.
4. Berkas bernama `arcorp-backup-AAAA-BB-HH.db.enc` tersimpan di komputer Anda. Batas: 5 unduhan per jam.

Backup diambil dari salinan database yang utuh dan konsisten (termasuk data terbaru yang belum dipindahkan ke berkas
utama), lalu dienkripsi dengan AES-256-GCM. Kunci diturunkan dari kata sandi dengan scrypt.

## Membuka kembali (di komputer yang Anda percaya)
Perlu Node.js 18 atau lebih baru. Dari folder aplikasi:

```bash
node scripts/decrypt-backup.mjs arcorp-backup-2026-11-01.db.enc arcorp-backup.db
```

Skrip meminta kata sandi (tidak tampil saat diketik) dan menghasilkan berkas SQLite `arcorp-backup.db`. Berkas hasil
**tidak terenkripsi**, jadi simpan dan hapus dengan hati-hati. Skrip tidak menimpa berkas yang sudah ada.
Kata sandi yang salah, atau berkas yang rusak atau diubah, ditolak dengan pesan yang sama.

## Batasan yang perlu diketahui
- Ini melindungi **berkas backup** (hilang, dicuri, atau terkirim ke orang yang salah). Data di server tetap
  dilindungi oleh keamanan akun Railway Anda.
- Unduhan plain lama dinonaktifkan; alamat lama `/api/admin/backup` kini menjawab pesan bahwa backup terenkripsi.
- Memulihkan backup ke server (mengganti berkas database) dilakukan secara manual dan hati-hati oleh pengembang.
