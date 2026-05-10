# Phase 2A — Async Audit, Onboarding, and Audit History

**Status:** Draft for review
**Date:** 2026-05-10
**Owner:** sanatan
**Parent spec:** `2026-05-10-careeros-saas-phased-plan-design.md` (Phase 2)
**Branch:** `phase-2a-async-audit-onboarding`, stacked on `phase-1-stabilize-restyle`.

## 1. Why split Phase 2

Master Phase 2 has six features. Three of them (async audit, onboarding wizard, audit history) form one tightly coupled slice that all touch the audit pipeline:

- The wizard's final step kicks off an audit. It must use the new async pipeline or it inherits Phase 1's symptoms.
- Audit history is a read view over the same `careerAudits` rows the async pipeline writes.

The other three (application tracker, daily check-in, email digests) are independent retention features that consume — but don't modify — the audit pipeline. They are deferred to Phase 2B so each phase remains a reviewable PR.

## 2. Goals

1. Replace synchronous audit POST with **async job + status polling**, so a 60s Vercel function timeout is no longer the failure mode.
2. New users see a **3-step onboarding wizard** instead of the empty dashboard.
3. Users can browse **audit history** with readiness/skill deltas over time, replacing the placeholder `marketTrends` chart on the main dashboard.

## 3. Non-goals

- Application tracker (Phase 2B).
- Daily check-in / streak refactor (Phase 2B).
- Email digests (Phase 2B).
- Stripe / billing (Phase 3).
- Resume rewriter / LaTeX / cover letters (Phase 4).
- Any change to landing page or 3D cloud component.

## 4. Architecture

```
                              ┌──────────────────────────────┐
   /dashboard/onboarding ───▶ │  Onboarding wizard (3 steps) │
                              └──────────────┬───────────────┘
                                             │ POST /api/audit/start
                                             ▼
   POST /api/audit/start ────▶ creates audit_jobs row (status=queued)
                                returns { jobId } in <500ms
                                             │
                                             ▼
                              Inngest function: audit/run
                                  ├─▶ pdf parse (S3 url already saved)
                                  ├─▶ Gemini parallel calls
                                  ├─▶ embed
                                  ├─▶ insert careerAudits row
                                  └─▶ update audit_jobs.status
                                        (running → done | failed)
                                             │
   GET /api/audit/[jobId] ◀────────────── reads audit_jobs row
                                             │
   /dashboard ─ on focus ──▶ polls latest job, refreshes audit data
   /dashboard/history ─────▶ paginated list of careerAudits rows
```

**New modules:**
- `src/lib/jobs/inngest.ts` — Inngest client + function definitions.
- `src/lib/audit/runner.ts` — pure async function that does parse → Gemini → embed → DB. Called from Inngest function and (in dev) directly.
- `src/lib/audit/dev-runner.ts` — fallback that runs `runner.ts` synchronously when `INNGEST_EVENT_KEY` is missing, so local dev without Inngest credentials still works.
- `src/lib/audit/trend.ts` — `getAuditTrend(userId)`, shared by `/dashboard` and `/dashboard/history`.
- `src/lib/audit/require-onboarded.ts` — predicate consumed by `dashboard/layout.tsx`.
- `src/app/api/audit/start/route.ts` — accepts the resume PDF, uploads to S3, creates a queued `audit_jobs` row, fires Inngest event.
- `src/app/api/audit/[jobId]/route.ts` — reads `audit_jobs` status (+ joined audit if done).
- `src/app/api/audit/[jobId]/retry/route.ts` — re-fires the Inngest event for a failed job.
- `src/app/api/audit/latest-job/route.ts` — returns the user's most-recent `audit_jobs` row or null.
- `src/app/api/inngest/route.ts` — Inngest's webhook endpoint.
- `src/app/dashboard/onboarding/page.tsx` — 3-step wizard (client component).
- `src/app/dashboard/history/page.tsx` — audit history (server component) + `src/components/audit/HistoryDrawer.tsx` (client) for the audit-detail dialog.
- `src/components/audit/AuditProgress.tsx` — polling progress component (client).

**Deprecated (keep but no longer the default path):**
- `src/app/api/resume/route.ts` — kept temporarily for backwards compatibility (any old client code) but updated to call the new flow internally. Marked `@deprecated`. Removed in Phase 2B.

## 5. Data model

### New table

```ts
export const auditJobs = pgTable("audit_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // queued | running | done | failed
  progress: jsonb("progress").default({}), // { stage: "parsing" | "ai" | "embed" | "saving", pct: number }
  s3Url: varchar("s3_url", { length: 1024 }),
  fileName: varchar("file_name", { length: 512 }),
  targetRole: varchar("target_role", { length: 255 }),
  githubUrl: varchar("github_url", { length: 512 }),
  error: text("error"),
  auditId: integer("audit_id").references(() => careerAudits.id),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
});
```

### `users` table addition

```ts
onboardedAt: timestamp("onboarded_at"),
```

### Migration

Single Drizzle migration file under `drizzle/` produced by `drizzle-kit generate`. Applied via `drizzle-kit push` against Neon. Document in the Vercel checklist.

## 6. Component breakdown

### 6.1 Async audit pipeline

**Public interface (server-side):**

```ts
// src/lib/audit/runner.ts
export async function runAuditJob(jobId: number): Promise<void>
```

Reads the `audit_jobs` row, fetches the PDF from S3, runs the existing `parseResumeWithGemini` / `parseResumeStructured` / `generateEmbedding` calls, persists the `careerAudits` row, and updates `audit_jobs.status` between stages.

**Inngest function:**
```ts
// src/lib/jobs/inngest.ts
export const auditRun = inngest.createFunction(
  { id: "audit-run", retries: 1 },
  { event: "audit/run" },
  async ({ event, step }) => {
    await step.run("execute", () => runAuditJob(event.data.jobId));
  }
);
```

**Dev fallback:** if `process.env.INNGEST_EVENT_KEY` is missing at request time, `/api/audit/start` invokes `runAuditJob(jobId)` directly with `void` (fire-and-forget) instead of `inngest.send`. The endpoint still returns immediately with the jobId. This keeps local dev workable without an Inngest account.

### 6.2 Status endpoint

`GET /api/audit/[jobId]` returns:

```jsonc
{
  "success": true,
  "data": {
    "id": 42,
    "status": "running" | "queued" | "done" | "failed",
    "progress": { "stage": "ai", "pct": 60 },
    "auditId": 17,           // present when status=done
    "error": null
  }
}
```

Auth: caller must be the same Clerk user that owns the job. 403 otherwise.

### 6.3 `<AuditProgress>` polling component

Props: `{ jobId: number; onComplete: (auditId: number) => void; onError: (err: string) => void }`.

Behavior: polls `GET /api/audit/[jobId]` every 1.5s. Renders a 4-step indicator (Parse → AI Audit → Embed → Save). Stops polling on terminal status. Backoff on errors (1.5s → 3s → 6s, cap 6s, max 5 minutes total).

### 6.4 Onboarding wizard

Route: `/dashboard/onboarding`.

**Routing rule:** added in `src/app/dashboard/layout.tsx`. After hydrating `dbUser`, if `onboardedAt` is null AND the path is not already `/dashboard/onboarding`, render a redirect. Server-side redirect via a small `requireOnboarded()` helper used by the layout.

**Steps:**
1. **Resume.** Drag/drop or pick a `.pdf`. Calls `POST /api/audit/start` immediately on selection. Shows `<AuditProgress>` underneath while user proceeds to step 2.
2. **Target role.** Free-text input + the existing role-suggestion chips from `/dashboard/resume`.
3. **Goals.** Two questions: weekly cadence (1–7 days), primary goal (job-switch / promotion / skill-up). Stored in `users` (new column `goalKind`) — *deferred*; for Phase 2A we just store these in `users` columns later. Actually: to keep this phase tight, we only persist `onboardedAt` and `targetRole` (which the audit already takes). Other survey answers are dropped on the floor for now and re-collected in 2B if needed.

On step 3 submit: set `onboardedAt = now()`, redirect to `/dashboard`. The audit may still be running; the dashboard's existing polling (Section 6.5) handles it.

### 6.5 Dashboard polling

`src/app/dashboard/page.tsx` already calls `/api/dashboard/data` once on mount. Add: also call `/api/audit/latest-job` once on mount. If a non-terminal job exists, mount `<AuditProgress>` in a banner at the top of the page; on completion, call the existing `fetchDashboardData()`. No polling needed elsewhere.

New endpoint: `GET /api/audit/latest-job` returns the user's most-recent `audit_jobs` row or `null`.

### 6.6 Audit history

Route: `/dashboard/history`.

Server component (RSC): reads up to 24 most-recent `careerAudits` rows for the user, sorted desc. Renders:

- **Trend chart** (line, monochrome): `readinessScore` and `marketMatchScore` over `createdAt`. Replaces the placeholder `marketTrends` data on the main dashboard with real numbers (the main dashboard reads the same data via a tiny shared loader).
- **Skill-delta table:** for each pair of consecutive audits, the per-skill delta from `skillMap`.
- **Per-audit drawer:** clicking a row opens a `Dialog` with the full audit JSON.

`/dashboard/page.tsx` chart now reads from `audit_jobs`-derived series via a new `getAuditTrend(userId)` helper. Hard-coded `marketTrends` removed.

## 7. Backwards compatibility

The current `/dashboard/resume/page.tsx` calls `POST /api/resume` directly. We won't break it in this phase:

- `/api/resume` is updated to internally do what `/api/audit/start` does (create job + fire event) and **wait** for completion via a `step.waitForEvent`-equivalent — actually no, that resurrects the timeout problem. Cleaner: `/api/resume` returns the same shape it did before but with `data.jobId` populated and `data.audit` populated only if the audit completed within a 5s window; otherwise `audit` is null and the client should redirect to a "your audit is processing" view. We'll change the resume page in this phase to use the new endpoint.

Concretely, `/dashboard/resume/page.tsx` is updated to:
1. Call `POST /api/audit/start`.
2. Render `<AuditProgress>` in the same panel.
3. On complete, fetch the audit data the way it does today.

`/api/resume/route.ts` keeps working but emits a `console.warn` deprecation notice and forwards to `/api/audit/start` semantics.

## 8. Failure handling

- **Inngest unavailable:** dev fallback runs synchronously (Section 6.1).
- **Gemini error in runner:** `audit_jobs.status = "failed"`, `error = err.message`. Wizard / dashboard surface a retry button → `POST /api/audit/[jobId]/retry` → re-fires Inngest event with same job row, status reset to queued.
- **Polling client gives up:** after 5 minutes, surface a retry CTA. The job may still complete server-side; the next dashboard load will pick it up.
- **Auth mismatch:** 403 on status endpoint, never leak job state across users.

## 9. Tests (Vitest, server-side only)

- `tests/audit-runner.test.ts` — mocks Gemini + DB; verifies `runAuditJob` updates status transitions (queued → running → done) and writes to `careerAudits`.
- `tests/audit-jobs-status.test.ts` — endpoint returns 403 for cross-user access; returns 404 for missing job.
- `tests/onboarding-redirect.test.ts` — pure unit test on the `requireOnboarded` predicate function.
- `tests/audit-trend.test.ts` — `getAuditTrend(userId)` returns chronologically-sorted readiness numbers.

UI tests are out of scope (no Playwright in the project); we rely on manual smoke + TypeScript.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Inngest free tier rate limits | Single function, batch=1, retries=1; well within free tier for early users |
| Job row written but Inngest event never fires | Status remains `queued`; UI shows a "stuck" state with retry button after 60s |
| Long Gemini call exceeds Inngest step duration | Inngest steps default to 2 hours — far above the 60s our work needs |
| Multiple browser tabs polling same job | Status endpoint is read-only and cached for 1s; no concurrency issue |
| Onboarding redirect loop | Predicate skips redirect when path already begins with `/dashboard/onboarding` |
| Schema migration on prod | Migration is additive (one new table, one nullable column); zero downtime |

## 11. Rollout

1. Apply migration to dev Neon DB.
2. Deploy preview; confirm wizard + audit + history work end-to-end with Inngest dev mode.
3. Set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in Vercel prod.
4. Apply migration to prod Neon DB.
5. Promote.
6. After 1 week of clean prod logs, delete `/api/resume/route.ts` (deprecated) in Phase 2B.

## 12. Open questions

None for this phase. Master-spec defaults already chosen: Resend (deferred to 2B), Inngest (this phase). The "save to tracker" question is for Phase 2B.

---

**Next step after approval:** invoke `writing-plans` to break Phase 2A into tasks.
