# Deploying Masira to Vercel

## 1. Database (PostgreSQL 15+)

Masira needs a PostgreSQL 15 or newer database. Either option works:

- **Existing database** — if your local/dev database already has the tables
  and seed data, you can point production at a copy of it.
- **New managed database** (e.g. Neon, Supabase, or a Postgres integration
  from the Vercel Marketplace). Then create the tables and seed data:

  ```bash
  DATABASE_URL="<production url>" npx prisma db init
  DATABASE_URL="<production url>" npx tsx seed-businesses.ts
  DATABASE_URL="<production url>" npx tsx seed-organisations.ts
  DATABASE_URL="<production url>" npx tsx seed-projects.ts
  ```

  The `prisma db init` command comes from `prisma-8.md`. Prisma 8 is a
  release candidate, so check its current docs before running it against
  production.

Note: `migrations/app/` contains only an early migration (`user`/`post`
tables) that does not match the current `prisma/contract.prisma`. Do not
rely on it to build the production schema.

## 2. Vercel project

1. Import the GitHub repository into Vercel (framework preset: Next.js).
2. Under **Settings → Environment Variables**, add every variable listed in
   `.env.example`. Set `APP_URL` to the production URL
   (e.g. `https://masira.vercel.app`) with no trailing slash.
3. Deploy. Every later push to the production branch redeploys automatically.

## 3. Email sign-in

Sign-in uses magic links sent through Resend. `AUTH_EMAIL_FROM` must use a
domain you have verified in Resend. Only `OWNER_EMAIL` can sign in.

## Known limitations

- `lib/rate-limit.ts` keeps its counters in memory. On serverless hosting
  each instance has its own counters, so the limits are best-effort only.
