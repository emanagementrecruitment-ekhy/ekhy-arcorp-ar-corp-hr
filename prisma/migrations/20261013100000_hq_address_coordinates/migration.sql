-- Kantor pusat dipindah ke alamat office (Jl. Mangga Besar IX, Jakarta Barat).
-- Lokasi terdaftar yang masih memakai titik lama (Monas) ikut dipindah; lokasi lain tidak disentuh.
UPDATE "Employee"
SET "homeLat" = -6.148, "homeLng" = 106.8205
WHERE ROUND("homeLat", 4) = -6.2088 AND ROUND("homeLng", 4) = 106.8456;
