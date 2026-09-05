# Deploying AR Corp HR

## Environment variables

Required:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Prisma/SQLite connection string, e.g. `file:./prod.db`. See **Database** below before picking this. |
| `SESSION_SECRET` | Signs the login session JWT. Generate a fresh one for production — don't reuse the dev value in `.env`: `openssl rand -hex 32` |

Optional (real OTP delivery — see `.env.example` for the full list and `src/lib/otp-providers.ts`):

| Var | Enables |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Real email OTPs |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | Real SMS OTPs |

Leave the optional ones unset and the app keeps working exactly as it does now: codes are logged server-side and shown on the OTP screen (only outside `NODE_ENV=production`).

## Database — read before deploying

This app uses **SQLite, a single file on disk** (`prisma/dev.db` locally). That's fine on a host with a persistent filesystem (a VPS, Railway, Fly.io, Render, a Docker container with a mounted volume). It is **not** fine on a stateless/serverless platform (Vercel, most PaaS "serverless functions") — the file gets wiped on every deploy and isn't shared across instances, so logins, vouchers, and kasbon submitted by users would silently vanish.

- **Deploying to a persistent host**: no changes needed. Just make sure `DATABASE_URL` points at a writable, persistent path and that path survives restarts/redeploys.
- **Deploying to Vercel or another serverless platform**: swap SQLite for a hosted database first. The path of least change is Postgres — update `datasource db { provider = "postgresql" }` in `prisma/schema.prisma`, point `DATABASE_URL` at a hosted instance (Vercel Postgres, Neon, Supabase, Railway Postgres, ...), then run `npx prisma migrate dev` once locally against it to regenerate the migration for the new provider (SQLite and Postgres migrations aren't wire-compatible).

## Build & run

```bash
npm ci
npx prisma migrate deploy      # applies existing migrations; does NOT reset data
npm run build
npm start                       # or: npm run db:seed  first, for a demo instance with seed data
```

`npm run db:seed` wipes and reseeds all app data (see `prisma/seed.ts`) — only run it for a fresh demo, never against real data.

## Known gap

There's currently no UI to add/edit employees, voucher values, or accounts — those only exist via `prisma/seed.ts`. The design (`../project/AR Corp HR.dc.html`) didn't call for one either (the Karyawan tab is read-only: "Admin pusat hanya melihat dan mengunduh laporan"). For a real multi-tenant deployment beyond the 6 seeded employees + 3 office accounts, that admin CRUD would need to be built — ask if you want it added.
