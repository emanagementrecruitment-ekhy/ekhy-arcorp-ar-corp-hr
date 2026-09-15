#!/usr/bin/env bash
# Builds everything the Electron wrapper needs, then packages a Windows
# installer: (1) a standalone Next.js build of the main app, (2) a
# pre-migrated + pre-seeded template SQLite database for first-run offline
# mode, (3) the Windows .exe via electron-builder (needs wine on a
# non-Windows build machine — see the "wine64"/"wine32:i386" apt packages).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_DIR="$REPO_ROOT/desktop"
# Named "nextapp", not "app" — electron-builder auto-detects a subfolder
# literally called "app" as a second, "real" Electron app root (the
# two-package.json convention) and hijacks packaging to use THAT folder's
# package.json/main entry instead of ours, silently dropping main.js,
# preload.js, etc. from the build. Any other name sidesteps it.
APP_STAGE="$DESKTOP_DIR/nextapp"
TEMPLATE_DB="$DESKTOP_DIR/template.db"

echo "== 1/5 Building Next.js (standalone output) =="
cd "$REPO_ROOT"
rm -rf .next
npm run build

echo "== 2/5 Staging standalone app into desktop/app =="
rm -rf "$APP_STAGE"
mkdir -p "$APP_STAGE"
cp -r .next/standalone/. "$APP_STAGE/"
cp -r public "$APP_STAGE/public"
mkdir -p "$APP_STAGE/.next"
cp -r .next/static "$APP_STAGE/.next/static"
# Dev leftovers that standalone tracing pulls in but the desktop app must
# not ship: the working repo's .env (dev DATABASE_URL/secrets) and dev.db
# (local test data) — server-wrapper.js sets DATABASE_URL itself at runtime,
# and the real starting database is template.db, built fresh below.
rm -f "$APP_STAGE/.env"
rm -f "$APP_STAGE/prisma/dev.db"

echo "== 3/5 Building template.db (migrated + seeded, empty of real data) =="
rm -f "$TEMPLATE_DB"
export DATABASE_URL="file:$TEMPLATE_DB"
cd "$REPO_ROOT"
npx prisma migrate deploy
npx tsx prisma/ensure-office-accounts.ts
npx tsx prisma/ensure-demo-tera.ts
unset DATABASE_URL

echo "== 4/5 Installing desktop (Electron) dependencies =="
cd "$DESKTOP_DIR"
npm install

echo "== 5/5 Building Windows installer (electron-builder + wine) =="
npm run dist:win

echo "Done. Installer output: $DESKTOP_DIR/dist"
