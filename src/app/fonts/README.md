Font disimpan di proyek (bukan diunduh dari Google saat build) supaya build di Railway tidak bergantung pada internet.
Sumber: paket npm `@fontsource-variable/*` 5.3.0 (subset latin, sumbu bobot variabel). Lisensi: SIL Open Font License 1.1
(Cormorant Garamond, Manrope, Playfair Display, Inter, Montserrat, Work Sans) — boleh dipakai, disalin, dan disebarkan bersama aplikasi.

Font tambahan untuk sidebar admin (milik pemilik, lisensi SIL Open Font License 1.1; salinan lisensi ada di `licenses/`):
- `3DIsometric-Bold.ttf` — 3D Isometric (GGBotNet), dipakai untuk tulisan merek "AR CORP" di bagian bawah sidebar.
- `Unique.ttf` — Unique (hanya satu bobot; tampilan tebal memakai bobot 700 yang disintesis browser), dipakai untuk label peran, mis. "Owner".

Pilihan font tambahan di Pengaturan Tampilan (paket npm `@fontsource*` 5.3.0, subset latin, SIL Open Font License 1.1):
- Kerajaan: `cinzel-...` (Cinzel) + `josefin-sans-...` (Josefin Sans)
- Futuristik: `orbitron-...` (Orbitron) + `exo-2-...` (Exo 2)
- Seni: `abril-fatface-...` (Abril Fatface) + `raleway-...` (Raleway)
- Courier New Tebal: memakai font sistem "Courier New"; `courier-prime-...` (Courier Prime) hanya cadangan untuk perangkat yang tidak punya Courier New (mis. banyak ponsel Android).
