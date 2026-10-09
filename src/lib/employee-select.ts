import "server-only";

/**
 * Every Employee column except the profile photo.
 *
 * `photoDataUrl` is a base64 image that can be ~2 MB per person. A bare
 * `prisma.employee.findMany()` (or `include: { employee: true }`) reads it for
 * every row, so a dashboard or a polled list silently pulled hundreds of MB
 * out of SQLite just to show names. Use this `select` in any query that does
 * not display the photo; load the photo only where it is shown
 * (GET /api/admin/employees/[id]/photo, /api/profile/photo).
 */
export const EMPLOYEE_NO_PHOTO = {
  id: true,
  code: true,
  name: true,
  email: true,
  phone: true,
  level: true,
  customRate: true,
  salary: true,
  ageYears: true,
  weightKg: true,
  heightCm: true,
  role: true,
  accessRole: true,
  status: true,
  homeLat: true,
  homeLng: true,
  homePlace: true,
  channelLink: true,
  supervisorId: true,
  supervisorNote: true,
  nik: true,
  birthPlace: true,
  birthDate: true,
  liveLat: true,
  liveLng: true,
  liveAt: true,
  lastBirthdayNotifiedYear: true,
  createdAt: true,
  photoUpdatedAt: true,
} as const;
