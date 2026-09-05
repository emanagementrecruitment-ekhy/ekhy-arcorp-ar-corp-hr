# AR Corp HR

Production implementation of the `AR Corp HR.dc.html` design (see `../README.md`,
`../chats/chat1.md`, and `../project/AR Corp HR.dc.html` at the repo root) — a
commission/voucher-based payroll app for field staff, with GPS attendance,
kasbon (cash advance) requests, and a central operations dashboard.

Stack: Next.js (App Router) + TypeScript + Tailwind CSS v4, Prisma + SQLite,
custom email/phone + OTP auth (JWT session cookie via `jose`).

## Setup

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db and applies the schema
npm run db:seed          # seeds demo employees, vouchers, kasbon, chat
npm run dev
```

Open http://localhost:3000.

## Logging in

By default no SMS/email provider is configured, so OTP codes are logged to the
server console and — outside `NODE_ENV=production` — also returned to the
browser and shown directly on the OTP screen. To send real codes instead, set
`SMTP_*` (email) and/or `TWILIO_*` (SMS) env vars — see `.env.example` and
`src/lib/otp-providers.ts`. Whichever channel matches how someone logs in
(email vs. phone) is used automatically; unset channels keep falling back to
the console/dev-code behavior.

Seeded accounts (portal tab in parentheses):

- **Field staff (STAFF & PR)**: `ekhy@arcorp.id` (AR-01, Platinum), `dewi@arcorp.id` (AR-02, Silver),
  `bayu@arcorp.id` (AR-03, Platinum, supervisor), `sinta@arcorp.id` (AR-04, Silver),
  `fajar@arcorp.id` (AR-05, Platinum), `lia@arcorp.id` (AR-06, Silver) — or their phone numbers.
- **Office (OFFICE)**: `owner@arcorp.id` (can approve/reject kasbon), `consultant@arcorp.id`,
  `admin@arcorp.id` (view + download reports only).

Field-staff login continues into a GPS attendance step; browser geolocation is
used when granted, and falls back to the employee's registered field location
otherwise so the flow still completes.

## Notable decisions

- **Nav layout**: the design let you A/B/C-compare three navigation patterns
  for the employee app. Bottom tabs shipped as the real default; the other two
  (Hub Grid, Rail Samping) are kept as a static reference at `/dev/nav-layout`,
  linked from the admin sidebar, rather than wired up as a live toggle.
- **Kasbon approval**: restricted to the `OWNER` access role at the API level
  (`/api/admin/kasbon/[id]/decide`), matching the design's "hanya Owner yang
  dapat menyetujui atau menolak." Consultant/Admin Pusat can view and export
  reports but not decide.
- **Attendance radius**: 500 km from the Jakarta HQ, as confirmed by the user
  in the original design chat (not a typo for 500 m).
- Enum-like columns (`accessRole`, `level`, `status`, ...) are plain `String`
  in `prisma/schema.prisma` because SQLite has no native enum type; valid
  values are enforced in `src/lib/constants.ts`.

## Deploying

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) — env vars, build/run commands, and an
important caveat about SQLite on serverless hosts before you pick a platform.
