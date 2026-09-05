// Enum-like string values for SQLite columns (see prisma/schema.prisma header comment).

export const ACCESS_ROLES = ["KARYAWAN", "OWNER", "CONSULTANT", "ADMIN_PUSAT"] as const;
export type AccessRole = (typeof ACCESS_ROLES)[number];

export const OFFICE_ROLES: AccessRole[] = ["OWNER", "CONSULTANT", "ADMIN_PUSAT"];

export const EMPLOYEE_LEVELS = ["SILVER", "PLATINUM"] as const;
export type EmployeeLevel = (typeof EMPLOYEE_LEVELS)[number];

export const VOUCHER_STATUSES = ["MENUNGGU_VALIDASI", "TERVALIDASI", "DICAIRKAN"] as const;
export type VoucherStatus = (typeof VOUCHER_STATUSES)[number];

export const KASBON_STATUSES = ["MENUNGGU_OWNER", "DISETUJUI", "DITOLAK"] as const;
export type KasbonStatus = (typeof KASBON_STATUSES)[number];

export const VOUCHER_AMOUNT: Record<EmployeeLevel, number> = {
  SILVER: 150_000,
  PLATINUM: 400_000,
};

export const VOUCHER_LABEL: Record<EmployeeLevel, string> = {
  SILVER: "Silver",
  PLATINUM: "Platinum / Jasmine",
};

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

// Preset field locations offered when adding an employee — avoids needing a
// geocoding API just to seed a starting point. A location only matters as a
// fallback anyway: every real GPS check-in (src/app/api/attendance/checkin)
// overwrites it with the employee's actual coordinates going forward.
export const FIELD_CITIES = [
  { place: "Jakarta Selatan", lat: -6.2615, lng: 106.8106 },
  { place: "Jakarta Pusat", lat: -6.1805, lng: 106.8284 },
  { place: "Bandung", lat: -6.9175, lng: 107.6191 },
  { place: "Bekasi", lat: -6.2383, lng: 106.9756 },
  { place: "Semarang", lat: -6.9667, lng: 110.4167 },
  { place: "Surabaya", lat: -7.2575, lng: 112.7521 },
  { place: "Yogyakarta", lat: -7.7956, lng: 110.3695 },
  { place: "Medan", lat: 3.5952, lng: 98.6722 },
  { place: "Makassar", lat: -5.1477, lng: 119.4327 },
  { place: "Denpasar", lat: -8.6705, lng: 115.2126 },
] as const;

export const FIELD_ROLES = ["Konsultan Lapangan", "Supervisor Lapangan"] as const;
