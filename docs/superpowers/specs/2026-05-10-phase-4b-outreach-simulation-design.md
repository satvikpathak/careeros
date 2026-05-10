# Phase 4B — Outreach Drafts + Career Simulation v2

**Status:** Draft for review
**Date:** 2026-05-10
**Owner:** sanatan
**Parent spec:** `2026-05-10-careeros-saas-phased-plan-design.md` (Phase 4)
**Branch:** `phase-4b-outreach-simulation`, stacked on `phase-4a-rewriter-cover-gap`.

## 1. Why this slice

Closes out the master Phase 4 with the two remaining AI moat features:

- **Outreach drafts** — generates personalized cold email + LinkedIn DM templates. Pro-gated, **copy-only** (no sending — keeps us out of email-deliverability and LinkedIn-ToS land).
- **Career simulation v2** — "what if I learn X for N months" — projects readiness/market-match deltas given target skills. Replaces the placeholder hard-coded curves on the dashboard with a model-driven projection from the user's audit history.

Both ship together because they share the same UI surface (a "Tools" tab on the dashboard or a sub-route of an existing area), reuse the JD-input + audit-on-file plumbing from 4A, and consume new quota kinds that follow the Phase 3 pattern.

## 2. Goals

1. A Pro user picks a JD (paste or URL via the existing 4A JD pipeline) plus optional recipient hint (name + title) and gets:
   - One cold email draft (subject + body)
   - One LinkedIn DM draft (≤ 300 chars)
   - Copy-to-clipboard buttons. No send button anywhere.
2. A Pro user enters one or more skills + a horizon (1, 3, 6, 12 months) and sees a projected readiness/market-match curve, plus a list of "fastest-impact" skills the model recommends.
3. Free users hitting either feature see a 402 → existing `<UpgradeModal>`.

## 3. Non-goals

- **No email/LinkedIn sending** — copy-only. Sending requires SMTP/OAuth + abuse handling we're not building yet.
- **No A/B variants** — one email + one DM per generation. (Future: tone selector like cover letters.)
- **No per-recipient enrichment scraping** — recipient hint is what the user types. We don't lookup LinkedIn profiles.
- **No Monte-Carlo simulation** — the projection is a deterministic blend of: existing audit trend (Phase 2A) + Gemini-estimated lift per chosen skill. Plain math, explainable.
- **No replacement of dashboard chart** — that already reads from audit history (Phase 2A). Simulation v2 lives on its own page; the dashboard chart is unchanged.
- **No simulation persistence beyond the latest run per user** — no version history, no sharing.

## 4. Architecture

```
                    /dashboard/tools/outreach
                    /dashboard/tools/simulate
                              │
                              ▼
              POST /api/outreach/run         ◀── Pro gate (canUse("outreach"))
              POST /api/simulate/run         ◀── Pro gate (canUse("simulation"))
                              │
                              ▼
              Gemini 2.5 Flash
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
       outreach_drafts            simulations
       (1 row per generation)     (1 row per generation, latest replaces)
```

**New modules:**
- `src/lib/outreach/run.ts` — generate email + DM drafts.
- `src/lib/gemini-prompts/outreach.ts` — outreach prompt template (one prompt, two outputs).
- `src/lib/simulate/run.ts` — orchestrate simulation: blend audit trend + projected lift.
- `src/lib/simulate/project.ts` — pure math: combine baseline + lift + horizon → series.
- `src/lib/gemini-prompts/simulate.ts` — Gemini prompt for per-skill lift estimate.

**New routes:**
- `POST /api/outreach/run` — gated.
- `GET /api/outreach/[id]` — load saved draft.
- `POST /api/simulate/run` — gated.
- `GET /api/simulate/latest` — load latest sim for current user.

**New pages:**
- `src/app/dashboard/tools/page.tsx` — index (just two cards linking to the two sub-routes).
- `src/app/dashboard/tools/outreach/page.tsx` — generator + drafts viewer.
- `src/app/dashboard/tools/simulate/page.tsx` — skill picker + chart.

**Modified files:**
- `src/db/schema.ts` — add `outreach_drafts`, `simulations` tables.
- `src/lib/billing/plans.ts` — add `"outreach"` and `"simulation"` to `UsageKind` + `getQuota` mappings (Pro/Team unlimited, free 0).
- `src/app/dashboard/client-layout.tsx` — add "Tools" nav link.

## 5. Data model

### `outreach_drafts`

```ts
export const outreachDrafts = pgTable("outreach_drafts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jdId: integer("jd_id").references(() => jds.id),
  recipientName: varchar("recipient_name", { length: 255 }),
  recipientTitle: varchar("recipient_title", { length: 255 }),
  emailSubject: varchar("email_subject", { length: 512 }).notNull(),
  emailBody: text("email_body").notNull(),
  dmBody: text("dm_body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### `simulations`

```ts
export const simulations = pgTable(
  "simulations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull().unique(),
    targetSkills: jsonb("target_skills"), // string[]
    horizonMonths: integer("horizon_months").notNull(),
    series: jsonb("series"), // [{ month: 0..N, readiness, marketMatch }]
    suggestedSkills: jsonb("suggested_skills"), // [{ skill, lift, why }]
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);
```

`unique(userId)` — one simulation per user; new runs upsert.

Migration is additive. One Drizzle file.

## 6. Component breakdown

### 6.1 Outreach

**Inputs:** `jdId` (existing 4A `jds` row), optional `recipientName`, optional `recipientTitle`.

**Prompt** (`src/lib/gemini-prompts/outreach.ts`):

```
Generate ONE concise cold email and ONE LinkedIn DM for this candidate to send to a recruiter / hiring manager about the role.

Rules:
- The email is 4-6 sentences. The DM is ≤ 300 characters.
- Mention 1 specific reason for the company drawn from the JD.
- Cite 1 concrete achievement from the candidate's audit.
- No emojis, no exclamation marks beyond one in the close.
- The candidate sends this themselves — write in first person.

OUTPUT EXACTLY this JSON:
{
  "emailSubject": "string",
  "emailBody": "string",
  "dmBody": "string"
}
```

**Run helper** (`src/lib/outreach/run.ts`):

```ts
export interface OutreachInput {
  userId: number;
  jdId: number;
  jdText: string;
  recipientName?: string;
  recipientTitle?: string;
}

export async function runOutreach(input: OutreachInput): Promise<{ id: number; emailSubject: string; emailBody: string; dmBody: string }>;
```

Reads latest `careerAudits` row for `userId`, throws `no_audit_on_file` if none. Builds the candidate profile blob (role, top skills, top achievement). Calls Gemini, parses JSON safely, persists to `outreach_drafts`, returns.

**Route:** `POST /api/outreach/run` follows Phase 4A's pattern — auth + Pro gate via `canUse("outreach")` + 402 envelope on quota fail + `recordUsage("outreach", { draftId })` on success.

**UI** (`/dashboard/tools/outreach`):
- `<JdInput>` (Phase 4A) at top.
- Two text inputs for recipient name + title (optional).
- "Generate" button → renders email panel + DM panel side-by-side.
- Each panel has a copy button (`navigator.clipboard.writeText`) and a "Generated at <time>" caption.
- 402 → `<UpgradeModal>`.

### 6.2 Simulation v2

**Pure projection** (`src/lib/simulate/project.ts`):

```ts
export interface BaselinePoint { date: string; readiness: number; marketMatch: number; }
export interface SkillLift { skill: string; readinessLift: number; marketMatchLift: number; }
export interface ProjectionPoint { month: number; readiness: number; marketMatch: number; }

export function project(input: {
  baselineLatest: { readiness: number; marketMatch: number };
  baselineSlope: { readiness: number; marketMatch: number }; // per-month from audit history
  lifts: SkillLift[]; // applied across the horizon
  horizonMonths: number;
}): ProjectionPoint[];
```

Math:

1. **Baseline slope** computed from the user's last `≤ 6` `careerAudits` rows by linear regression (or simple last-vs-first if regression tooling is overkill). This is an existing-trend curve.
2. **Total lift** = sum of `readinessLift` (capped at `100 - currentReadiness`) and `marketMatchLift` (capped at `100 - currentMarketMatch`) from chosen skills.
3. **Lift application** is sigmoid-shaped across the horizon: 10% by 30%-of-horizon, 50% by 60%-of-horizon, 90% by horizon end. Pure JS; no library.
4. **Output:** `horizonMonths + 1` points (month 0 = today's baseline; month H = baseline+slope×H + full lift).

Pure function — no DB access, fully unit-testable.

**Per-skill lift estimate** (`src/lib/gemini-prompts/simulate.ts`):

The Gemini call takes the candidate's current skill map + their target role + the chosen skills, returns:

```json
{
  "lifts": [
    { "skill": "kubernetes", "readinessLift": 5, "marketMatchLift": 8, "why": "Listed in 70% of senior backend JDs you've looked at" }
  ],
  "suggestedSkills": [
    { "skill": "rust", "readinessLift": 4, "marketMatchLift": 6, "why": "..." }
  ]
}
```

`suggestedSkills` is the "fastest-impact" alternative recommendation regardless of what the user chose.

**Run helper** (`src/lib/simulate/run.ts`):

1. Fetch user's last 6 audits → compute baseline slope.
2. Call Gemini for per-skill lifts + suggestions.
3. Run `project()` to build the series.
4. Upsert into `simulations` (unique on `userId`).

**Route:** `POST /api/simulate/run` follows the gate-then-record pattern with `kind: "simulation"`.

**UI** (`/dashboard/tools/simulate`):
- Skill multiselect (Combobox built from chips). Pre-fill with the user's current skill gaps from their latest audit (`audit.atsKeywordAnalysis.skill_gaps`).
- Horizon selector: 1 / 3 / 6 / 12 months (radio chips).
- "Run simulation" button.
- Result: a Recharts `LineChart` with two series (readiness, market match) — same monochrome palette as Phase 2A history chart.
- Below the chart: 3 cards for `suggestedSkills` (`<skill>` · `+<lift>%` · `<why>`).
- 402 → `<UpgradeModal>`.

### 6.3 Quota kinds

Add `"outreach"` and `"simulation"` to `UsageKind`:

```ts
export type UsageKind = "audit" | "chat" | "roadmap" | "sprint_regen" | "rewriter" | "cover_letter" | "outreach" | "simulation";
```

Update `getQuota`:
```ts
case "outreach":
case "simulation":
  return plan === "free" ? 0 : Infinity;
```

Free → 402 immediately. Pro/Team → unlimited, recorded for analytics later.

### 6.4 Tools page index

`/dashboard/tools/page.tsx` — two `<Card>` tiles:
- "Outreach drafts" → `/dashboard/tools/outreach`
- "Career simulation" → `/dashboard/tools/simulate`

Plus a one-line description per card. Pro badge on each tile so free users know up-front.

### 6.5 Nav

Add `{ href: "/dashboard/tools", label: "Tools" }` to `client-layout.tsx` nav, between AI Interview and Settings.

## 7. Failure handling

| Failure | Behavior |
|---|---|
| No audit on file | 400 with `no_audit_on_file` → UI redirects to `/dashboard/resume` |
| Gemini returns invalid JSON | One retry with stricter prompt; fall back to a generic safe template with placeholder fields the user can edit |
| Free user hits route | 402 + `<UpgradeModal>` |
| Simulation with no chosen skills | 400 — UI disables Run button until at least 1 skill chosen |
| Baseline has < 2 audits | Slope = 0 (flat line); the lift dominates, which is fine |
| User cancels / re-runs simulation | Upsert pattern keeps only the latest |

## 8. Tests

- `tests/simulate-project.test.ts` — pure projection math: zero lifts → flat line at baseline+slope; full lift caps at 100; sigmoid monotonicity; horizon=1 returns 2 points.
- `tests/outreach-prompt.test.ts` — `runOutreach` calls Gemini with the right blob shape (mock); persists row.
- `tests/outreach-route.test.ts` — 402 for free user.
- `tests/simulate-route.test.ts` — 402 for free user.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Outreach drafts read as obvious AI slop | Prompt explicitly forbids exclamation marks and emojis; cites concrete fact from candidate audit + JD; user has to copy-paste so they can edit before sending |
| Simulation projection looks too rosy | UI explicitly labels "Projected" with a tooltip explaining: "Estimates based on your audit history + Gemini lift estimates. Not a guarantee." |
| ToS angle on LinkedIn DM generation | We never automate sending — purely text generation, equivalent to the user writing it themselves. No automation, no scraping. |
| Recipient hint enables targeted spam | We rate-limit `outreach` to a sane per-day cap even on Pro (e.g. 50/day) via `usage_events` count. (Add post-launch if abuse appears; v1 ships without it.) |
| Gemini lift numbers are ungrounded | Each lift carries a `why` string the user sees; user can dispute by simply not learning that skill. The chart is "what could be," not "what will be." |

## 10. Rollout

1. Apply migration to dev Neon (2 new tables).
2. Set up a Pro test user (manual flip in `subscriptions`).
3. Smoke: pick a JD on outreach page → generate → copy email → paste in client → looks reasonable.
4. Smoke: simulate → choose 2 skills, 6mo horizon → see chart that ends ~5-15% above baseline.
5. Free user → 402 modal on both routes.
6. Push to prod.

## 11. Open questions

None blocking. Two YAGNI'd:
- Variant tones for outreach (formal/casual) — only if user feedback demands it.
- Per-day rate limit on outreach for Pro — only if abuse appears.

---

**Next step after approval:** invoke `writing-plans` to break Phase 4B into tasks.
