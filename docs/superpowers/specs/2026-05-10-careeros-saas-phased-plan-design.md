# CareerOS — Phased SaaS Maturity Plan

**Status:** Draft for review
**Date:** 2026-05-10
**Owner:** sanatan
**Constraints (hard):**
- Do not modify the public landing page (`src/app/page.tsx`).
- Do not modify the 3D cloud / Spline component (`src/components/SplineScene.tsx`, `src/components/CloudBackground.tsx`).
- All UI changes are scoped to authenticated areas (`/dashboard/**`, `/sign-in`, `/sign-up`) and shared chrome consumed only by them.

## 1. Goals

1. **Unblock production** — make the deployed dashboard render the audit reliably.
2. **Look professional** — a unified monochrome design system across all post-login surfaces.
3. **Behave like a SaaS** — accounts → quotas → billing → retention loops → analytics.
4. **Earn the YC pitch** — clear monetization, retention, differentiation, and operability.

## 2. Non-goals

- Mobile apps. Web responsive only.
- Marketing site changes (landing page, pricing page on the marketing side, blog).
- Replacing existing AI provider (Gemini stays).
- Localization / i18n.

## 3. Architecture deltas at a glance

```
                   ┌─────────────────────────────────────────────┐
                   │  Next.js App Router (already in place)      │
                   └─────────────────────────────────────────────┘
                                │
   ┌────────────────────────────┼─────────────────────────────────────────┐
   │                            │                                         │
   ▼                            ▼                                         ▼
Clerk auth              API routes (Node runtime,                Async job runner
+ Stripe-linked         maxDuration=60)                          (Phase 2): Inngest
metadata                  - /api/resume → enqueues job           or Vercel Queue
                          - /api/audit/[id] → returns status
                          - /api/billing/* (Stripe webhooks)
                          - /api/applications/*  (tracker)
                          - /api/usage/*
                                │
                                ▼
                  Neon Postgres (Drizzle) + new tables:
                  audit_jobs, applications, usage_events,
                  email_subscriptions, daily_checkins,
                  referral_codes, referrals
```

New shared modules:
- `src/lib/billing/stripe.ts` — Stripe SDK + plan catalog.
- `src/lib/usage.ts` — record + check quotas.
- `src/lib/email/` — provider client (Resend) + templated digests.
- `src/lib/analytics.ts` — PostHog server + client wrappers.
- `src/lib/jobs/` — async job enqueuer + status helper.
- `src/components/ui/tokens.ts` — design tokens consumed by `tailwind.config` and components.

## 4. Phased plan

Each phase is independently shippable, has a verifiable success criterion, and ends in a demo-able state.

---

### Phase 1 — Stabilize & Restyle

**Goal:** the deployed dashboard works after audit, and every post-login surface looks like one product.

**Scope:**

1. **Deploy fix (resume audit)**
   - Add `export const runtime = "nodejs"` and `export const maxDuration = 60` to `src/app/api/resume/route.ts`.
   - Add the same to any other route doing Gemini calls (`/api/chat`, `/api/roadmap`, `/api/quiz`, `/api/sprint/generate`).
   - Add structured logging at each stage of the audit pipeline so future failures are diagnosable from Vercel logs.
   - Audit the `/api/dashboard/data` happy path: ensure normalization handles both legacy (`snake_case`) and current (`camelCase`) shapes (already partially done — verify).
   - Add a one-time idempotency guard so a double-submit doesn't insert two audit rows.
   - Add a README "Vercel env checklist" so missing `DATABASE_URL` / `CLERK_*` is caught pre-deploy.

2. **Monochrome design system**
   - Define tokens in `src/components/ui/tokens.ts`:
     - Surfaces: `ink` `#0A0A0A`, `surface-0` `#FFFFFF`, `surface-1` `#FAFAFA`, `surface-2` `#F5F5F5`, `border` `#E5E5E5`.
     - Text: `text-primary` `#0A0A0A`, `text-secondary` `#525252`, `text-muted` `#A3A3A3`.
     - Semantic (low-saturation only): `success` `#16A34A`, `warning` `#CA8A04`, `danger` `#DC2626`, `info` `#525252`.
     - Radii: `sm 8`, `md 12`, `lg 16`. Retire the `[24px]` everywhere.
     - Shadows: `sm` 1px hairline; `md` for floating menus only.
   - Refactor shared components to consume tokens: `Button`, `Card`, `Badge`, `Progress`, `Input`, `Select`, `Tabs`, `Dialog`, `Toast`.
   - Add `<StatCard>`, `<SectionHeader>`, `<EmptyState>`, `<DataTable>` primitives so pages stop reinventing them.
   - Update every authenticated page to use the new components — `/dashboard`, `/dashboard/resume`, `/dashboard/jobs`, `/dashboard/roadmap`, `/dashboard/resources`, `/dashboard/chat`, plus `sign-in` / `sign-up` chrome.
   - Charts (`recharts`): one stroke color (`ink`), one fill (`surface-2`), one accent (`text-secondary`). No rainbow palette in `marketTrends` / `topPerformers` / radars.
   - Replace ad-hoc color literals (`#005BB7`, `bg-amber-50`, `text-emerald-500`, …) with token classes.
   - Keep all framer-motion timings; only the visual style changes.

3. **Navigation cleanup (post-login only)**
   - Standardize on `AppNavbar` with token-driven styles.
   - Add a persistent left rail (icon-only, collapsible) for quick switching between dashboard sections — the existing `DashboardSidebar.tsx` is repurposed.
   - Top-right cluster: usage chip → upgrade CTA (placeholder until Phase 3) → user button.

**Success criteria:**
- Live URL: upload resume → audit completes → dashboard shows readiness/skill data without refresh.
- Lighthouse on `/dashboard` ≥ 90 perf, ≥ 95 a11y.
- Zero color literals outside `tokens.ts` (enforced by an ESLint rule for `text-*-500|600|700`, `bg-*-50|100`, hex literals in `style=`).
- Side-by-side screenshot review: every authenticated page reads as one product.

**Out of scope here:** billing, async jobs, email, application tracker.

---

### Phase 2 — Retention slice

**Goal:** users come back. The product creates a habit and keeps a memory of progress.

**Scope:**

1. **Onboarding wizard**
   - 3 steps after first sign-in: (1) upload resume, (2) pick target role, (3) confirm goal & cadence.
   - Replace the current "No Career Audit Found" empty state on `/dashboard` with a directed wizard route.
   - Persist wizard completion to `users.onboarded_at`.

2. **Async audit + progress streaming**
   - New table `audit_jobs (id, user_id, status, progress, started_at, finished_at, error, audit_id)`.
   - `/api/resume` enqueues a job and returns `{ jobId }` immediately.
   - Job runner: Inngest (preferred) or a Vercel cron+queue pattern.
   - `/api/audit/[id]/status` for polling; resume page shows live progress (Parse → AI Audit → Embed → Save).
   - Dashboard automatically refreshes when the latest job is `done`.

3. **Application tracker**
   - New table `applications (id, user_id, job_title, company, source_url, status, applied_at, next_action_at, notes, resume_version)`.
   - Status enum: `saved | applied | screening | interview | offer | rejected | withdrawn`.
   - New page `/dashboard/applications` — Kanban + list view, drag between columns.
   - "Save to tracker" button on existing `/dashboard/jobs` cards.
   - Reminder cadence (defaults, user-overridable): `saved` 7d, `applied` 10d, `screening` 5d, `interview` 3d. Stale cards surface on the dashboard "Needs attention" widget.

4. **Audit history & versioning**
   - The DB already keeps every `careerAudits` row. Add `/dashboard/history` showing readiness over time + per-skill deltas.
   - On the dashboard, the existing "Performance Trends" chart now reads real data from history instead of hard-coded `marketTrends`.

5. **Daily check-in**
   - New table `daily_checkins (id, user_id, date, summary, applications_sent, hours_studied)`.
   - Compact widget on the dashboard; updates streak.
   - Streak calculation moves to the server; the current `streakCount` int gets a backfill job.

6. **Email digests (transactional + weekly)**
   - Resend or Postmark provider abstraction (`src/lib/email/`).
   - Templates: welcome, weekly sprint digest (Monday), readiness changed, streak at risk.
   - Preferences stored in `email_subscriptions (user_id, kind, enabled)`; managed in `/dashboard/settings`.
   - Sent via cron (Vercel Cron or Inngest scheduled function).

**Success criteria:**
- New user completes onboarding without leaving the wizard.
- Audit submission returns < 2s and a progress UI streams to completion.
- A user can save a job from `/dashboard/jobs`, drag it across columns, and see a reminder fire.
- Weekly digest renders correctly in a test inbox; preferences toggle works end-to-end.

---

### Phase 3 — Revenue slice (Stripe + quotas)

**Goal:** the product can be sold.

**Scope:**

1. **Plan catalog**
   - Free: 1 audit / 30 days, 20 AI chat messages / day, 3 applications tracked, no resume rewriter, no cover letters.
   - Pro ($19/mo): unlimited audits, unlimited chat, unlimited applications, resume rewriter, cover letters, priority Gemini.
   - Team ($49/seat/mo, future): admin view, shared resources, SSO (placeholder; not built in this phase).

2. **Stripe integration**
   - `src/lib/billing/stripe.ts` — Stripe SDK, plan catalog, helpers.
   - Webhook route `/api/billing/webhook` for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
   - Mirror state in DB: `users.stripeCustomerId`, `users.stripeSubscriptionId`, `users.subscriptionTier` (already in schema), `users.subscriptionStatus`, `users.currentPeriodEnd`.
   - Customer portal link via Stripe Billing Portal session.

3. **Pricing page (post-login only)**
   - `/dashboard/billing` — plans, current usage, upgrade/downgrade, manage payment method (deep-link to Stripe portal).

4. **Usage metering & gates**
   - `usage_events (id, user_id, kind, count, occurred_at)` — append-only.
   - `src/lib/usage.ts` — `record(kind)`, `check(kind)`, `currentMonthCount(kind)`.
   - Server-side enforcement on heavy endpoints (resume audit, chat, roadmap, sprint regenerate, rewriter, cover letter).
   - Client-side display: "3 of 20 AI messages today" chip in nav.
   - Friendly upgrade modal when a free user hits a gate.

5. **Settings → Plan & Billing tab**
   - Current plan, renewal date, usage breakdown, "Manage billing" → Stripe portal, "Cancel" flow.

**Success criteria:**
- Test mode: a free user can hit a gate, click upgrade, complete Stripe checkout, see Pro features unlock without manual reload.
- Webhook re-delivery is idempotent (verified by replaying a test event).
- Subscription cancellation downgrades the user at period end, not immediately.
- All metered endpoints reject when over quota with a typed error the UI can present cleanly.

---

### Phase 4 — Differentiation / AI moat

**Goal:** features users will pay for and tell friends about.

**Scope:**

1. **Resume rewriter (Pro)**
   - **Input modes:**
     - (a) existing parsed PDF resume + JD URL or pasted JD (default).
     - (b) **LaTeX source** — user attaches a `.tex` file or pastes a public link (GitHub raw `.tex`, Overleaf "Publish → Source" URL, gist). The rewriter modifies the `.tex` directly so the user's existing template / formatting is preserved.
   - **LaTeX flow:**
     - Fetch + parse the `.tex` (allowed sources: github.com raw, githubusercontent.com, gist.github.com, overleaf.com publish links). Block any URL that resolves to private IP ranges (SSRF guard).
     - Identify editable regions (bullets, summary, skills) without touching preamble/macros. AST-light approach: regex around known section headers + `\item` lines, fall back to string-diff replace on safe blocks.
     - Apply rewrites; produce a modified `.tex` + a unified diff for review.
     - **Compile to PDF server-side** via Tectonic (single-binary LaTeX) packaged as a separate Vercel function with `runtime = "nodejs"` and `maxDuration = 60`. If compile fails (template uses unsupported package), return the modified `.tex` only with a clear "compile yourself in Overleaf" CTA.
     - Persist versions in a new `resume_versions (id, user_id, source_kind, source_url, content_tex, pdf_url, jd_hash, created_at)` table.
   - **PDF flow (non-LaTeX):** rewritten resume rendered to `.docx` (already have `docx` dep) and `.pdf` via server-side renderer.
   - Diff view: per-bullet changes, keyword highlights, "accept all / accept some" controls.
   - Save rewritten versions per JD on the user's profile.

2. **Cover letter generator (Pro)**
   - Input: parsed resume + JD + tone selector (formal/conversational/concise).
   - Output: generated letter, editable, copy/download.
   - Library of saved letters tied to applications in the tracker.

3. **JD-resume gap analyzer**
   - One-shot tool: paste JD → keyword coverage report → suggested edits.
   - Free tier gets a teaser; Pro gets the full report and one-click apply-suggestions.

4. **Auto-outreach drafts (Pro)**
   - Personalized cold email + LinkedIn DM templates keyed to the company + role.
   - "Copy to clipboard" only. No actual sending — keeps us out of email-deliverability and ToS land.

5. **Career simulation v2**
   - "What if I learn X for 3 months" — uses current audit + roadmap data + market signals to project readiness change.
   - Replaces the placeholder `marketTrends` data with simulation-derived series.

**Success criteria:**
- A Pro user generates a rewritten resume against a real JD, downloads a clean .docx, and pastes it into the tracker.
- Gap analyzer runs in < 8s and returns actionable, keyword-grounded edits.
- Simulation produces deterministic outputs given the same inputs (snapshot tested).

---

### Phase 5 — Operability & trust

**Goal:** can run at scale, can pass a YC due-diligence skim.

**Scope:**

1. **Analytics**
   - PostHog (server + client). Events: signup, onboarding step, audit submitted/completed, application saved/moved, upgrade clicked, subscription started, cancellation.
   - Funnel dashboards: onboarding, free→paid, weekly retention.

2. **Error monitoring**
   - Sentry on Next.js (server + client). Source maps uploaded in CI.
   - Alert on >X errors / 5min in `#alerts`.

3. **Feature flags**
   - PostHog feature flags or GrowthBook. Gate Phase 4 features behind flags during gradual rollout.

4. **Privacy & legal**
   - Static authenticated-only pages: Privacy Policy, Terms of Service, Data Processing Addendum stub.
   - Add data-export ("Download my data") and data-deletion ("Delete my account") flows. Required for GDPR/CCPA optics.

5. **Public profile / share link**
   - Optional `/p/[slug]` showing a sanitized career card. User-controlled visibility.
   - K-factor lever; tracked in PostHog.

6. **Referral system**
   - `referral_codes (code, owner_user_id)`, `referrals (referrer_id, referee_id, status, awarded_at)`.
   - Reward: 1 month Pro on both sides when referee converts.
   - Surface in `/dashboard/settings/referrals`.

7. **Admin console (gated)**
   - `/dashboard/admin` visible only to staff Clerk role.
   - User search, audit re-run, refund link, feature-flag overrides.

**Success criteria:**
- PostHog dashboard shows the full funnel.
- Sentry catches a deliberately thrown test error in prod.
- A user can export and delete their data end-to-end.
- One referral round-trip works in test mode.

---

## 5. Data model deltas (cumulative)

```
users:
  + onboarded_at TIMESTAMP
  + stripe_customer_id VARCHAR
  + stripe_subscription_id VARCHAR
  + subscription_status VARCHAR  -- active | trialing | past_due | canceled | incomplete
  + current_period_end TIMESTAMP
  + role VARCHAR DEFAULT 'user'  -- user | staff

audit_jobs:          (Phase 2)
applications:        (Phase 2)
daily_checkins:      (Phase 2)
email_subscriptions: (Phase 2)
usage_events:        (Phase 3)
resume_versions:     (Phase 4)
referral_codes:      (Phase 5)
referrals:           (Phase 5)
```

All migrations done via Drizzle Kit. Each phase ships its own migration file.

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Vercel function timeout still hits during async job ingest | Move heavy work to Inngest scheduled functions, not the request path |
| Stripe webhook missed → user pays but doesn't get Pro | Idempotent webhook + reconciliation cron that scans Stripe daily |
| Monochrome refactor regresses charts/tables | Snapshot tests on chart props + visual review per page |
| Email bounce / spam complaints | Use Resend with verified domain, plain-text fallback, prominent unsubscribe |
| Quota check happens client-side and is bypassed | All gates enforced server-side; client display is purely informational |
| Audit data privacy (resumes contain PII) | Encrypt at rest where possible; data-export & deletion flows in Phase 5 |
| LaTeX URL fetch → SSRF / private-IP exfil | Allowlist hostnames (github raw, gist, overleaf publish), reject private IPs, 5MB cap |
| LaTeX compile fails for exotic templates | Always return modified `.tex` even when PDF fails; clear "compile in Overleaf" fallback |

## 7. Sequencing & checkpoints

1. **Phase 1** ships first as one PR set. After live verification of the deploy fix and monochrome rollout, we move on.
2. Each subsequent phase gets its own brainstorming → spec → plan → implementation cycle. Phases are independent enough that 2 and 3 could run in parallel later, but we'll go serial first to keep diffs reviewable.
3. After every phase: a short retro updates this doc with what changed.

## 8. Open questions (please confirm before Phase 1 implementation plan)

1. Email provider: **Resend** (recommended) vs Postmark vs SES? *(Phase 2)*
2. Async job runner: **Inngest** (recommended) vs Vercel Cron + queue table? *(Phase 2)*
3. Pricing: confirm **Free / Pro $19 / Team $49** or different numbers? *(Phase 3)*
4. Should the existing `/dashboard/jobs` page be the source of "Save to tracker", or do we add a separate import flow? *(Phase 2)*
5. Public profile: opt-in by default off, or off entirely until user enables? *(Phase 5)* — recommend off entirely until enabled.

---

**Next step after approval:** I'll invoke `writing-plans` to break Phase 1 into a step-by-step implementation plan with exact file paths and verification steps.
