// Enum-like string values for SQLite columns (see prisma/schema.prisma header comment).

export const ACCESS_ROLES = ["KARYAWAN", "OWNER", "CONSULTANT", "ADMIN_PUSAT", "SUPERVISOR"] as const;
export type AccessRole = (typeof ACCESS_ROLES)[number];

// Full admin data access (Karyawan, Kasbon, Laporan, Lokasi & Absensi, ...).
// SUPERVISOR (Kepala Mess) is deliberately excluded — it's a narrower,
// view-only role scoped to Laporan Lapangan only (see requireSession calls
// in src/app/api/admin/lapor/route.ts and src/app/admin/layout.tsx).
export const OFFICE_ROLES: AccessRole[] = ["OWNER", "CONSULTANT", "ADMIN_PUSAT"];

// Ordered lowest to highest pendapatan/VCR — drives dropdown display order.
// MANUAL sits last: it has no fixed rate (see VOUCHER_AMOUNT and
// employeeRate() below — its real rate lives on Employee.customRate).
export const EMPLOYEE_LEVELS = ["CLASSIC_D", "FL", "SILVER", "GOLD", "LB", "PLATINUM", "LV", "MODEL", "MANUAL"] as const;
export type EmployeeLevel = (typeof EMPLOYEE_LEVELS)[number];

export const VOUCHER_STATUSES = ["MENUNGGU_VALIDASI", "TERVALIDASI", "DICAIRKAN"] as const;
export type VoucherStatus = (typeof VOUCHER_STATUSES)[number];

export const KASBON_STATUSES = ["MENUNGGU_OWNER", "DISETUJUI", "DITOLAK"] as const;
export type KasbonStatus = (typeof KASBON_STATUSES)[number];

// MANUAL's 0 here is a placeholder — always resolve an employee's actual
// rate through employeeRate() below, which substitutes their customRate.
export const VOUCHER_AMOUNT: Record<EmployeeLevel, number> = {
  CLASSIC_D: 95_000,
  FL: 105_000,
  SILVER: 150_000,
  GOLD: 250_000,
  LB: 300_000,
  PLATINUM: 400_000,
  LV: 500_000,
  MODEL: 700_000,
  MANUAL: 0,
};

export const VOUCHER_LABEL: Record<EmployeeLevel, string> = {
  CLASSIC_D: "ST",
  FL: "FL",
  SILVER: "SILVER",
  GOLD: "GOLD",
  LB: "LB",
  PLATINUM: "PLATINUM / JASMINE",
  LV: "LV",
  MODEL: "MODEL",
  MANUAL: "MANUAL INPUT",
};

/** An employee's real per-voucher rate — MANUAL substitutes their own stored customRate. */
export function employeeRate(level: EmployeeLevel, customRate?: number | null): number {
  return level === "MANUAL" ? customRate ?? 0 : VOUCHER_AMOUNT[level];
}

export const KASBON_LABEL: Record<KasbonStatus, string> = {
  MENUNGGU_OWNER: "Menunggu Owner",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
};

export const VOUCHER_STATUS_LABEL: Record<VoucherStatus, string> = {
  MENUNGGU_VALIDASI: "Menunggu validasi",
  TERVALIDASI: "Tervalidasi",
  DICAIRKAN: "Dicairkan",
};

// AR Corp head office — Jakarta.
export const HQ = { lat: -6.2088, lng: 106.8456 };
export const HQ_NAME = "Kantor Pusat — Jakarta";
export const ATTENDANCE_RADIUS_KM = 500;

export const SESSION_COOKIE = "arcorp_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // one field shift

export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_MAX_ATTEMPTS = 5;

// Preset field locations (venues) offered when adding an employee. A location
// only matters as a fallback anyway: every real GPS check-in
// (src/app/api/attendance/checkin) overwrites it with the employee's actual
// coordinates going forward. These venues don't have known coordinates yet,
// so they default to HQ (0 km, dalam radius) until a real check-in happens —
// update the lat/lng here once each venue's actual address is known.
export const FIELD_CITIES = [
  { place: "CLASSIC BUNGKER", lat: HQ.lat, lng: HQ.lng },
  { place: "CLASSIC T2", lat: HQ.lat, lng: HQ.lng },
  { place: "CLASSIC T5", lat: HQ.lat, lng: HQ.lng },
  { place: "COLLO (1001)", lat: HQ.lat, lng: HQ.lng },
  { place: "EMVO", lat: HQ.lat, lng: HQ.lng },
  { place: "HRV", lat: HQ.lat, lng: HQ.lng },
  { place: "LA", lat: HQ.lat, lng: HQ.lng },
  { place: "MA", lat: HQ.lat, lng: HQ.lng },
  { place: "MALIO", lat: HQ.lat, lng: HQ.lng },
  { place: "MEDIKA", lat: HQ.lat, lng: HQ.lng },
  { place: "MTR", lat: HQ.lat, lng: HQ.lng },
  { place: "MTR2", lat: HQ.lat, lng: HQ.lng },
  { place: "OFFICE", lat: HQ.lat, lng: HQ.lng },
  { place: "ROYAL", lat: HQ.lat, lng: HQ.lng },
  { place: "SA", lat: HQ.lat, lng: HQ.lng },
  { place: "V-CLUB", lat: HQ.lat, lng: HQ.lng },
] as const;

export const FIELD_ROLES = ["Admin", "Kepala Mess", "Koordinator", "Recruitment", "Salon", "Staff", "Tera"] as const;

// Only Peran "Tera" earns via Pendapatan/VCR (per-voucher commission) — every
// other Peran is salaried (Gaji, a fixed monthly nominal on Employee.salary).
// This is enforced everywhere an employee's income is read or recorded, not
// just display: see the level/customRate vs. salary split in
// prisma/schema.prisma and every call site that branches on usesVcr().
export const VCR_ROLE = "Tera";
export function usesVcr(role: string): boolean {
  return role === VCR_ROLE;
}

// Peran values that come with a real elevated login (see /admin/jabatan —
// Owner/Consultant appoint one karyawan holding this Peran into the matching
// AccessRole). Every other Peran (Koordinator, Recruitment, Salon, Staff, Tera)
// is purely a descriptive label with no access change.
export const APPOINTABLE_ROLES: { peran: string; accessRole: AccessRole; label: string }[] = [
  { peran: "Admin", accessRole: "ADMIN_PUSAT", label: "Admin" },
  { peran: "Kepala Mess", accessRole: "SUPERVISOR", label: "Kepala Mess" },
];
