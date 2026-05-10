# Vercel Environment Checklist

Before promoting a deploy, verify every variable is set in **Production** (and **Preview** if you preview-test):

## Required
- `DATABASE_URL` — Neon Postgres connection string. Without it, the dashboard returns empty data and audits never persist. See `src/db/index.ts`.
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — auth. Without them every protected route returns 401.
- `GEMINI_API_KEY` — Gemini 2.5 Flash. Without it, audit / chat / roadmap / quiz routes throw.

## Optional but recommended
- `RAPIDAPI_KEY` — falls back to mock data if missing.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME` — without these S3 upload is skipped (S3 URL becomes `local://...`); audit still saves.

## Function settings
- All routes under `src/app/api/**` listed in `src/lib/runtime-config.ts` consumers run on the **Node** runtime with `maxDuration=60`.
- Confirm the project's Vercel plan allows 60-second function durations (Pro or Fluid Compute on Hobby).

## Smoke test after deploy
1. Sign in.
2. Upload a resume on `/dashboard/resume`.
3. Within 30s, navigate to `/dashboard` — readiness/skill data should render.
4. If empty: check Vercel Function logs for the resume route — look for `DB persistence failed` or Gemini timeouts.
