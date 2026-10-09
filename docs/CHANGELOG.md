# Changelog

Semua perubahan notable pada project ini akan didokumentasikan di file ini.

Format ini berdasarkan [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan project ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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

### Added
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
### Added
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