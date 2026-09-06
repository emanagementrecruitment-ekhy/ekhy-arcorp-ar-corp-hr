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

## Deploying to Railway (recommended — supports SQLite as-is)

1. **New Project → Deploy from GitHub repo**, pick `ekhy-arcorp-ar-corp-hr`. Railway auto-detects Next.js via Nixpacks; no Dockerfile needed.
2. **Add a volume**: Project → your service → Settings → Volumes → New Volume. Mount path `/data`. Without this the SQLite file lives on ephemeral storage and every redeploy wipes it.
3. **Variables** (Settings → Variables):
   - `DATABASE_URL` = `file:/data/prod.db` (must match the volume's mount path)
   - `SESSION_SECRET` = a fresh random value (`openssl rand -hex 32` — don't reuse the one in `.env`)
   - Optionally `SMTP_*` or `TWILIO_*` for real OTP delivery — see above. **Without these, OTP codes only appear in Railway's deploy logs** (Deployments → View Logs), not on screen, since `NODE_ENV=production` there — set one of these up first if you want to actually log in from a phone without digging through logs.
4. **Start command** (Settings → Deploy → Custom Start Command): `npm run start:railway`. This runs `prisma migrate deploy`, then seeds demo data **only if the database is empty** (`prisma/seed-if-empty.js` — safe to redeploy without wiping real data), then starts on Railway's assigned `$PORT`.
5. Deploy. Railway gives you a `*.up.railway.app` URL — open that on a phone and log in with any seeded account (`ekhy@arcorp.id`, `owner@arcorp.id`, etc.) or one you add via the app.

## Managing employees post-deploy

Owner and Consultant accounts can add, edit, and delete field employees directly from the Karyawan page in the app (Aksi column) — no shell/database access needed. Voucher values (Silver/Platinum amounts) and access-role accounts (Owner/Consultant/Admin Pusat) are still seed-only; ask if you want those made editable in the UI too.
