# Deployment

| Part | Service | Config |
|---|---|---|
| Database | **Neon** (PostgreSQL) | dashboard only |
| API | **Render** (web service, free plan) | `render.yaml` |
| Web | **Vercel** | `apps/web/vercel.json` |
| Errors | **Sentry** (2 projects: `cmt-api`, `cmt-web`) | `apps/api/src/instrument.ts`, `apps/web/src/sentry.ts` |

Every merge to `main` deploys automatically (Render + Vercel are connected to GitHub).
Database migrations run automatically when the API starts (`prisma migrate deploy`).

## 1. Neon (database)
1. Sign up at neon.tech -> **New project** -> name `car-maintenance-tracker`, region **Europe (Frankfurt)**, PostgreSQL 17.
2. **Connect** -> copy the connection string (the *direct*, non-pooled one) - it looks like
   `postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`.
3. Keep it secret: it goes into Render only.

## 2. Sentry (error monitoring)
1. Sign up at sentry.io -> create 2 projects: **Node.js / NestJS** named `cmt-api`, and **React** named `cmt-web`.
2. Copy each project's **DSN** (Settings -> Client Keys).

## 3. Render (API)
1. Sign up at render.com with GitHub -> **New -> Blueprint** -> pick `car-maintenance-tracker`. Render reads `render.yaml`.
2. Fill in the values it asks for:
   - `DATABASE_URL` = the Neon connection string
   - `CORS_ORIGIN` = the Vercel URL (fill in after step 4; for now `http://localhost:5173`)
   - `SENTRY_DSN` = the `cmt-api` DSN
3. Deploy. When it is live, open `https://<service>.onrender.com/api/health` -> should show `"db":"up"`.
4. Free plan note: the API sleeps after ~15 minutes without traffic; the first request then takes ~30-60 seconds.

## 4. Vercel (web)
1. Sign up at vercel.com with GitHub -> **Add New -> Project** -> import `car-maintenance-tracker`.
2. **Root Directory**: `apps/web` (Vercel then uses `apps/web/vercel.json`). Framework: Vite.
3. Environment variables:
   - `VITE_API_URL` = `https://<service>.onrender.com/api`
   - `VITE_SENTRY_DSN` = the `cmt-web` DSN
4. Deploy, then put the Vercel URL (e.g. `https://car-maintenance-tracker.vercel.app`) into Render's `CORS_ORIGIN`
   (comma-separate several URLs if needed) and redeploy the API.

## 5. Verify
- Web URL shows **API: ok** and **Database: up**.
- Sentry: in Render set `SENTRY_DEBUG=true`, open `/api/health/sentry-test` -> the error appears in the `cmt-api` project. Set it back to `false`.

## Environment variables (production)
| Variable | Where | Value |
|---|---|---|
| `DATABASE_URL` | Render | Neon connection string |
| `CORS_ORIGIN` | Render | Vercel URL(s), comma-separated |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Render | generated automatically by the blueprint |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_DEBUG` | Render | `cmt-api` DSN, `production`, `false` |
| `VITE_API_URL` | Vercel | `https://<service>.onrender.com/api` |
| `VITE_SENTRY_DSN` | Vercel | `cmt-web` DSN |

## Troubleshooting
- **Render build fails on `corepack`**: change the start of the build command to `npm install -g pnpm@10.28.0 &&`.
- **Web shows "API: unreachable"**: check `VITE_API_URL` (must end with `/api`) and that `CORS_ORIGIN` on Render contains the exact Vercel URL (no trailing slash). Wait ~60s if the API was asleep.
- **`db: down`**: check `DATABASE_URL` and that it ends with `?sslmode=require`.
