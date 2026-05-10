# Phase 2B — Application Tracker, Daily Check-in, Email Digests

**Status:** Draft for review
**Date:** 2026-05-10
**Owner:** sanatan
**Parent spec:** `2026-05-10-careeros-saas-phased-plan-design.md` (Phase 2)
**Branch:** `phase-2b-tracker-checkin-email`, stacked on `phase-2a-async-audit-onboarding`.

## 1. Why this slice

Phase 2A built the data foundation (async audits, onboarding, history). Phase 2B turns that foundation into a **retention engine** — three independent retention features that share UI primitives but are otherwise decoupled:

- **Application tracker** — users save jobs from `/dashboard/jobs`, move them through a hiring funnel (Kanban). Stale columns surface on the dashboard.
- **Daily check-in** — a 30-second widget that updates the streak. Streak calculation moves from a free-floating int to a server-derived value.
- **Email digests** — Resend-powered weekly Monday digest, plus transactional welcome and "audit complete" emails. Per-user preferences.

Each subsystem ships independently behind its own commits. If the work runs long, splitting is cheap because there's no cross-coupling.

## 2. Goals

1. A user can save a job, move it through `saved → applied → screening → interview → offer/rejected/withdrawn` columns, and see stale cards bubble onto the dashboard.
2. A user clicks "Check in" once a day; their server-derived streak updates and shows on the dashboard.
3. A user receives a welcome email at sign-up, an "audit complete" email when their first audit finishes, and a Monday morning digest. They can toggle each in `/dashboard/settings`.

## 3. Non-goals

- Stripe / billing (Phase 3).
- Resume rewriter / LaTeX / cover letters (Phase 4).
- Public profile, referrals, admin (Phase 5).
- SMS / push notifications.
- "Auto-apply" / job-board side effects.
- Multi-step funnel analytics (event-stream tracking lands in Phase 5 PostHog).

## 4. Architecture

```
                     ┌──────────────────────────────────┐
                     │  Existing Phase 2A foundations   │
                     │  audit_jobs, careerAudits, users │
                     └──────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
   applications             daily_checkins         email_subscriptions
   (Kanban table)          (per-user, daily)      (per-user × kind toggle)
        │                         │                         │
        ▼                         ▼                         ▼
  /dashboard/applications   /dashboard (widget)     Resend (transactional)
  /dashboard/jobs          /api/checkin            Inngest cron (Monday 8am)
   "Save" button                                   /api/email/* webhooks
        │
        └─────► /dashboard ── "Needs attention" widget for stale cards
```

**New modules:**

- `src/lib/applications/repo.ts` — DB layer for the tracker (CRUD + stale query).
- `src/lib/checkin/streak.ts` — server-derived streak from `daily_checkins`.
- `src/lib/email/resend.ts` — Resend client + sender wrapper.
- `src/lib/email/templates/` — `welcome.tsx`, `audit-complete.tsx`, `weekly-digest.tsx` (React Email components).
- `src/lib/email/subscriptions.ts` — read/write `email_subscriptions`, defaulting unset rows to enabled.
- `src/lib/jobs/email-cron.ts` — Inngest cron function fired Monday 08:00 user-tz (simplified to UTC for v1).

**New routes:**

- `/api/applications/route.ts` — GET list, POST create.
- `/api/applications/[id]/route.ts` — PATCH (status, notes), DELETE.
- `/api/checkin/route.ts` — POST today's check-in.
- `/api/email/subscriptions/route.ts` — GET, PATCH preferences.
- `/api/email/test/route.ts` — POST a test send (gated to current user only).

**New pages:**

- `/dashboard/applications/page.tsx` — Kanban board.
- `/dashboard/settings/page.tsx` — section grid with Notifications and Profile cards (Profile is read-only for now; Notifications is the active tab in 2B).

**Modified pages/components:**

- `/dashboard/jobs/page.tsx` — add "Save to tracker" button per job card.
- `/dashboard/page.tsx` — add **Daily check-in** widget and **Needs attention** widget.
- `dashboard/client-layout.tsx` — add `/dashboard/applications` and `/dashboard/settings` to navLinks.

**Inngest functions added:**

- `email/welcome` — fired on `user/signup` event (sent from sign-up handler).
- `email/audit-complete` — fired from `runAuditJob` on success.
- `email/weekly-digest` — Monday 08:00 UTC cron, fans out to one event per user.

## 5. Data model

```ts
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jobTitle: varchar("job_title", { length: 512 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  sourceUrl: varchar("source_url", { length: 1024 }),
  // Snapshot of the original job posting (RapidAPI shape) so we don't break if the source vanishes.
  jobSnapshot: jsonb("job_snapshot"),
  status: varchar("status", { length: 30 }).notNull().default("saved"),
  // saved | applied | screening | interview | offer | rejected | withdrawn
  notes: text("notes"),
  appliedAt: timestamp("applied_at"),
  nextActionAt: timestamp("next_action_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const dailyCheckins = pgTable("daily_checkins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  // Stored as a UTC date (YYYY-MM-DD). One row per user per day.
  checkinDate: varchar("checkin_date", { length: 10 }).notNull(),
  summary: text("summary"),
  applicationsSent: integer("applications_sent").default(0),
  hoursStudied: decimal("hours_studied", { precision: 4, scale: 1 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Composite uniqueness: (userId, checkinDate) — prevents duplicate check-ins.

export const emailSubscriptions = pgTable("email_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  kind: varchar("kind", { length: 50 }).notNull(),
  // welcome | audit_complete | weekly_digest | streak_at_risk
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Composite uniqueness: (userId, kind).
```

Drizzle migration adds three tables. Additive — zero downtime. The existing `users.streakCount` column is retained but becomes a denormalized cache; truth is computed from `daily_checkins`.

## 6. Component breakdown

### 6.1 Application tracker

**Repo interface:**

```ts
// src/lib/applications/repo.ts
export type ApplicationStatus = "saved" | "applied" | "screening" | "interview" | "offer" | "rejected" | "withdrawn";

export interface ApplicationRow { /* matches table */ }

export async function listApplications(userId: number): Promise<ApplicationRow[]>;
export async function createApplication(userId: number, input: { jobTitle: string; company: string; sourceUrl?: string; jobSnapshot?: any; }): Promise<ApplicationRow>;
export async function updateApplication(userId: number, id: number, patch: Partial<{ status: ApplicationStatus; notes: string; nextActionAt: Date | null; }>): Promise<ApplicationRow>;
export async function deleteApplication(userId: number, id: number): Promise<void>;
export async function listStaleApplications(userId: number): Promise<ApplicationRow[]>;
```

**Stale rules** (defaults, hardcoded for v1):
- `saved` ≥ 7 days
- `applied` ≥ 10 days
- `screening` ≥ 5 days
- `interview` ≥ 3 days

`offer | rejected | withdrawn` are terminal — never stale.

**Kanban page** (`/dashboard/applications`):
- Columns for each non-terminal status. Terminal statuses live in a collapsed "Closed" section at the bottom.
- Drag-and-drop between columns updates `status` and stamps `appliedAt` when entering `applied`.
- Each card: title, company, "Last activity" relative time, mini status pill.
- Empty-state CTA: "Save jobs from the Jobs page to start tracking."

**Drag library:** **`@dnd-kit/core`** + `@dnd-kit/sortable` (React-19 compatible, ~9 KB gzipped). Adding one dep.

**Save to tracker:**
- New "Save" button on each card in `/dashboard/jobs/page.tsx` calls `POST /api/applications` with the job snapshot.
- Success → toast "Saved to tracker" with a link to `/dashboard/applications`.
- The Saved button toggles state (re-clicking removes the row).

**Dashboard widget** ("Needs attention"):
- Sidebar widget on `/dashboard` that lists the top 5 stale cards.
- Empty state: "Nothing's stuck. Nice."

### 6.2 Daily check-in

**Server logic:**

```ts
// src/lib/checkin/streak.ts
export interface CheckinResult { streakDays: number; checkedInToday: boolean; }
export async function getStreak(userId: number): Promise<CheckinResult>;
export async function recordCheckin(userId: number, input?: { summary?: string; applicationsSent?: number; hoursStudied?: number; }): Promise<CheckinResult>;
```

`getStreak` computes by walking `daily_checkins` rows backwards from today (UTC) and counting contiguous days. Caches the result in `users.streakCount` (write-through) so dashboard render doesn't pay the cost.

`recordCheckin` upserts on `(userId, todayUtc)`. The composite unique index makes the second call a no-op (and not an error). Updates `users.streakCount` after recompute.

**Dashboard widget:**
- Compact card at the top of `/dashboard` (replaces the old streak-only badge).
- Shows: today's streak, "Check in" button if not yet checked in today, "Checked in ✓" if already done.
- Optional one-tap form: "Apps sent today: [_]  Hours studied: [_]" with Save button. Both optional.
- The existing static "Current Streak" badge in the welcome header is removed.

### 6.3 Email digests

**Provider:** Resend (`resend` npm package). Domain verification handled out-of-band by user.

**Templates** (React Email under `src/lib/email/templates/`):
- `welcome.tsx` — sent immediately after sign-up. CTA → `/dashboard/onboarding`.
- `audit-complete.tsx` — sent when an audit job transitions to `done`. Includes top-3 skill gaps + readiness score. CTA → `/dashboard`.
- `weekly-digest.tsx` — sent Monday 08:00 UTC. Includes streak, sprint progress (if any), top 3 stale applications, readiness delta vs last week.

**Send wrapper:**

```ts
// src/lib/email/resend.ts
export interface EmailEnvelope { to: string; subject: string; react: ReactElement; kind: EmailKind; userId: number; }
export async function sendEmail(envelope: EmailEnvelope): Promise<void>;
```

Skips when `process.env.RESEND_API_KEY` is missing (logs and returns). Skips when `email_subscriptions(userId, kind).enabled === false`. All sends include a List-Unsubscribe header pointing at `/dashboard/settings`.

**Inngest functions:**

- `email/welcome` — receives `{ userId }`, looks up email, renders & sends.
- `email/audit-complete` — receives `{ userId, auditId }`, fetches audit, renders & sends.
- `email/weekly-digest` — receives `{ userId }`. The Monday cron fans out by reading all users with `weekly_digest` enabled and emitting one event per user (Inngest's batch step semantics).

**Trigger points:**
- Sign-up → fired in `proxy.ts` Clerk webhook handler. Phase 2A doesn't have a Clerk-webhook setup; we add `/api/webhooks/clerk` here. Subscribed to `user.created` events. We DO NOT replace the existing layout-based lazy sync — it stays as a fallback.
- Audit complete → `runAuditJob` (Phase 2A) emits `email/audit-complete` event after the `done` transition. Wrapped in a `try/catch` so email failure doesn't fail the job.
- Monday cron → Inngest scheduled function `email/weekly-digest-cron` (cron expression `0 8 * * 1` UTC).

### 6.4 Settings page

`/dashboard/settings/page.tsx` — single tab in 2B: **Notifications**.

Renders one row per email kind with a toggle. Patches `email_subscriptions` on change. Optimistic update with rollback on error. Other tabs (Profile, Plan & Billing) are placeholders for future phases — show a "Coming soon" line so the IA is visible to users.

## 7. UI inventory

All built from Phase 1 monochrome primitives. No new design tokens.

| Component | Where | Re-uses |
|---|---|---|
| Kanban column | `/dashboard/applications` | `Card`, `Badge`, `EmptyState` |
| Application card | inside column | `Card`, mini `Badge` |
| "Needs attention" widget | `/dashboard` | `Card`, list rows |
| Daily check-in widget | `/dashboard` | `Card`, `Button`, `Input` (numeric) |
| Notification toggle row | `/dashboard/settings` | new `<Switch>` primitive (added) |
| Save-to-tracker button | `/dashboard/jobs` | `Button` (`size="sm"`), local toast |

`<Switch>` is a small new shadcn-style primitive (Radix Switch wrap). Added to `src/components/ui/switch.tsx`.

## 8. Tests (Vitest, server-side)

- `tests/applications-repo.test.ts` — CRUD + stale query (mocked DB).
- `tests/streak.test.ts` — date-walking logic with various inputs (today, yesterday, 3-day gap, etc.).
- `tests/email-subscriptions.test.ts` — defaults to enabled, PATCH writes correctly.
- `tests/email-resend.test.ts` — `sendEmail` skips when env missing, skips when subscription disabled, sends otherwise.
- `tests/applications-route.test.ts` — auth gate (403 for cross-user access on PATCH).

## 9. Failure handling

| Failure | Behavior |
|---|---|
| Resend API error | Log + return; don't fail the calling flow. Audit completion is independent of email delivery. |
| Inngest cron run while Inngest creds missing | The cron itself doesn't fire (the Inngest dev runner doesn't schedule). Acceptable for dev. |
| Drag-drop network error | Optimistic UI rolls back; toast surfaces error. |
| Duplicate check-in same day | The composite unique index makes it idempotent — repeats are no-ops, return current state. |
| Subscription row missing | Treat as enabled. Lazy-create on first PATCH. |
| Resend bounces / spam complaints | Out of scope; handled in Phase 5 ops. v1: domain must be verified by user before Resend will deliver. |

## 10. Risks

| Risk | Mitigation |
|---|---|
| Clerk webhook signature verification skipped → spoofed user-created events | Verify `svix-signature` per Clerk docs; reject malformed |
| @dnd-kit incompatibility with React 19 / Next 16 | Vetted: latest @dnd-kit (~6.3) supports React 19; pin version in lockfile |
| Email rendering breaks in some clients | Use React Email's tested components; add a plain-text fallback string |
| Streak compute on every page load is expensive | Cache in `users.streakCount`; recompute only on check-in |
| Time-zone drift in cron | v1 uses UTC across the board; document this; revisit in Phase 5 |
| User without an email row in DB but with a Clerk session | The lazy sync added in Phase 2A's layout fix handles this |

## 11. Rollout

1. Apply migration to dev Neon DB (three new tables; column not modified).
2. Configure Resend account, verify sending domain, set `RESEND_API_KEY`.
3. Configure Clerk webhook → `/api/webhooks/clerk`, subscribe to `user.created`. Set `CLERK_WEBHOOK_SECRET`.
4. Deploy preview; sign up as a test user → expect welcome email.
5. Save a job → it appears on `/dashboard/applications`. Drag through statuses.
6. Click "Check in" → streak increments; second click in same day is a no-op.
7. Manually trigger the weekly digest function in Inngest dev UI; confirm email rendered.
8. Set `INNGEST_*` keys, `RESEND_API_KEY`, `CLERK_WEBHOOK_SECRET` on Vercel prod.
9. Apply migration to prod Neon DB.
10. Promote.

## 12. Open questions

None — all master-spec defaults are taken. Stale-cadence numbers are hardcoded for v1 with a future-friendly path: a per-user override table can be added later without touching consumers (since the predicate lives in `repo.ts`).

---

**Next step after approval:** invoke `writing-plans` to break Phase 2B into tasks.
