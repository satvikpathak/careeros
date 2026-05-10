# Phase 3 — Dodo Payments Billing & Usage Gates

**Status:** Draft for review
**Date:** 2026-05-10
**Owner:** sanatan
**Parent spec:** `2026-05-10-careeros-saas-phased-plan-design.md` (Phase 3)
**Branch:** `phase-3-dodo-billing`, stacked on `phase-2b-tracker-checkin-email`.

## 1. Why Dodo, not Stripe

The master spec said Stripe. We're switching to Dodo Payments because:

- **Merchant of Record** — Dodo is the seller of record, so they handle global VAT/GST/sales-tax collection, invoicing, and remittance. For a pre-product-market-fit SaaS, that removes a class of compliance work we don't want to own.
- **Hosted checkout + portal** — fewer UI components to build than Stripe Elements + Billing Portal.
- **Webhook semantics** are equivalent in shape (`subscription.active`, `subscription.cancelled`, `payment.succeeded`, `payment.failed`) so the architecture in the master spec carries over with renamed event handlers.

Trade-offs: less mature API than Stripe, fewer integrations, smaller community. Acceptable at this stage.

## 2. Goals

1. A free user can hit a quota gate, click upgrade, complete Dodo checkout, and see Pro features unlock without a manual reload.
2. Webhook re-delivery is idempotent — replaying any event yields the same DB state.
3. Subscription cancellation downgrades the user **at period end**, not immediately. Past-due / failed payment puts the user in a `past_due` state with a 7-day grace.
4. Heavy endpoints (audit, chat, roadmap, sprint-regen) reject when over quota with a typed error the UI can render as a friendly upgrade modal.

## 3. Non-goals

- Tax-rate logic of any kind — Dodo handles it.
- Per-seat ACL/admin for the Team tier (placeholder pricing tier; no team UI in Phase 3).
- Annual / multi-month plans (monthly only in v1).
- Refund flow UI (handled in Dodo dashboard manually).
- Promo / coupon UI (Dodo supports it; we just don't surface it).
- Stripe migration tooling (we never had Stripe).

## 4. Architecture

```
                ┌─────────────────────────────────────────┐
                │  Dodo Payments hosted checkout + portal │
                └─────────────────────────────────────────┘
                                 ▲              │
        click "Upgrade"          │              │ webhook
                                 │              ▼
                  /api/billing/checkout      /api/webhooks/dodo
                  (creates session URL)     (signature-verified)
                                 │              │
                                 ▼              ▼
                          Dodo redirect   Mirror state into DB:
                                          subscriptions table
                                          + users.subscription*
                                 │
   /dashboard/billing  ◀──── reads subscription state, plan catalog,
                              usage stats; surfaces "Manage" link to
                              Dodo customer portal session

   Heavy endpoints  ◀── checkQuota(userId, kind) before doing work
   (audit, chat, ...)     records usage_event on success
```

**New modules:**

- `src/lib/billing/dodo.ts` — Dodo SDK client + plan catalog + helper functions.
- `src/lib/billing/plans.ts` — pure plan catalog (Free, Pro, Team) with quotas.
- `src/lib/billing/access.ts` — `getUserPlan(userId)`, `canUse(userId, kind)`, `recordUsage(userId, kind)`.
- `src/lib/billing/webhook-handlers.ts` — pure handlers per Dodo event type (no HTTP coupling).
- `src/app/api/billing/checkout/route.ts` — POST: creates Dodo checkout session, returns redirect URL.
- `src/app/api/billing/portal/route.ts` — POST: creates customer portal session, returns redirect URL.
- `src/app/api/billing/usage/route.ts` — GET: current month's usage breakdown for the user.
- `src/app/api/webhooks/dodo/route.ts` — webhook receiver with signature verification.
- `src/app/dashboard/billing/page.tsx` — pricing + current plan + usage breakdown + upgrade/manage CTAs.
- `src/components/billing/PlanCard.tsx` — plan comparison card.
- `src/components/billing/UpgradeModal.tsx` — modal shown when a free user hits a quota.

**Modified files:**

- `src/db/schema.ts` — add `subscriptions` table, add columns to `users`, add `usage_events` table.
- `src/lib/audit/runner.ts`, `src/app/api/chat/route.ts`, `src/app/api/roadmap/route.ts`, `src/app/api/sprint/generate/route.ts`, `src/app/api/audit/start/route.ts` — gate with `canUse` + record on success.
- `src/components/ui/usage-chip.tsx` — render real plan label from a new `/api/billing/me` endpoint.
- `src/app/dashboard/client-layout.tsx` — add `/dashboard/billing` to nav.
- `src/app/dashboard/settings/page.tsx` — add "Plan & Billing" section linking to `/dashboard/billing`.

## 5. Data model

### `users` table additions

```ts
dodoCustomerId: varchar("dodo_customer_id", { length: 255 }),
// existing: subscriptionTier varchar(50) default 'free'
subscriptionStatus: varchar("subscription_status", { length: 30 }), // active | past_due | cancelled | expired | trialing
currentPeriodEnd: timestamp("current_period_end"),
```

### `subscriptions` table (one row per user — currently active or most-recent)

```ts
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  dodoSubscriptionId: varchar("dodo_subscription_id", { length: 255 }).notNull(),
  dodoCustomerId: varchar("dodo_customer_id", { length: 255 }).notNull(),
  planKey: varchar("plan_key", { length: 50 }).notNull(), // pro | team (free has no row)
  status: varchar("status", { length: 30 }).notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  raw: jsonb("raw"), // last full webhook payload for debugging
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

`unique(userId)` — we collapse history into a single row per user; the `raw` jsonb captures the latest event for forensics. The "history" view can be reconstructed from Dodo if ever needed.

### `usage_events` table (append-only)

```ts
export const usageEvents = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  kind: varchar("kind", { length: 50 }).notNull(), // audit | chat | roadmap | sprint_regen | rewriter | cover_letter
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  metadata: jsonb("metadata"), // optional, e.g. { jobId: 17 }
});
```

Index on `(userId, occurredAt)` for the monthly-window aggregate queries.

### `webhook_events` table (idempotency log)

```ts
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 30 }).notNull(), // "dodo"
  externalId: varchar("external_id", { length: 255 }).notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  receivedAt: timestamp("received_at").defaultNow(),
  payload: jsonb("payload"),
});
// unique (provider, externalId)
```

Webhook handler `INSERT ... ON CONFLICT DO NOTHING` — duplicate deliveries from Dodo become no-ops without changing user state.

## 6. Plan catalog

```ts
// src/lib/billing/plans.ts
export type PlanKey = "free" | "pro" | "team";

export const PLANS: Record<PlanKey, {
  key: PlanKey;
  name: string;
  priceUsd: number;
  dodoProductId: string | null;
  features: string[];
  quotas: {
    auditPerMonth: number;
    chatPerDay: number;
    applicationsTracked: number;
    rewriter: boolean;
    coverLetter: boolean;
  };
}> = {
  free: {
    key: "free",
    name: "Free",
    priceUsd: 0,
    dodoProductId: null,
    features: ["1 audit per month", "20 AI messages per day", "Track up to 3 applications"],
    quotas: { auditPerMonth: 1, chatPerDay: 20, applicationsTracked: 3, rewriter: false, coverLetter: false },
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceUsd: 19,
    dodoProductId: process.env.DODO_PRO_PRODUCT_ID || "",
    features: ["Unlimited audits", "Unlimited chat", "Unlimited applications", "Resume rewriter", "Cover letters"],
    quotas: { auditPerMonth: Infinity, chatPerDay: Infinity, applicationsTracked: Infinity, rewriter: true, coverLetter: true },
  },
  team: {
    key: "team",
    name: "Team",
    priceUsd: 49,
    dodoProductId: process.env.DODO_TEAM_PRODUCT_ID || "",
    features: ["Everything in Pro", "Admin view (coming soon)", "Shared resources (coming soon)", "SSO (coming soon)"],
    quotas: { auditPerMonth: Infinity, chatPerDay: Infinity, applicationsTracked: Infinity, rewriter: true, coverLetter: true },
  },
};
```

The `team` plan in v1 is functionally identical to `pro` (no team admin UI yet) but lets us start building demand. Document this in the pricing-page copy.

## 7. Component breakdown

### 7.1 `getUserPlan(userId)`

```ts
// src/lib/billing/access.ts
export async function getUserPlan(userId: number): Promise<PlanKey> {
  // free if no subscription row OR status is "cancelled" past period end OR "expired"
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) });
  if (!sub) return "free";
  if (sub.status === "active" || sub.status === "trialing") return sub.planKey as PlanKey;
  if (sub.status === "past_due") {
    // 7-day grace
    const graceEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
    if (graceEnd && graceEnd > new Date()) return sub.planKey as PlanKey;
    return "free";
  }
  if (sub.status === "cancelled") {
    // cancelAtPeriodEnd → still active until period end
    if (sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()) return sub.planKey as PlanKey;
    return "free";
  }
  return "free";
}
```

### 7.2 Quota check + record

```ts
// src/lib/billing/access.ts
export type UsageKind = "audit" | "chat" | "roadmap" | "sprint_regen" | "rewriter" | "cover_letter";

export interface QuotaResult { allowed: boolean; reason?: string; planKey: PlanKey; used: number; limit: number; }

export async function canUse(userId: number, kind: UsageKind): Promise<QuotaResult>;
export async function recordUsage(userId: number, kind: UsageKind, metadata?: any): Promise<void>;
```

Implementation maps each `kind` to the right quota field on `PLANS[planKey].quotas` and runs the right window query (`auditPerMonth` → 30-day window from now; `chatPerDay` → midnight UTC).

Each metered endpoint inserts a usage_events row **only on success**, after the user-facing work completes.

### 7.3 Server-side gate pattern (each metered endpoint)

```ts
// inside POST handler, after auth resolution
const { canUse, recordUsage } = await import("@/lib/billing/access");
const quota = await canUse(dbUser.id, "audit");
if (!quota.allowed) {
  return NextResponse.json({
    success: false,
    error: "quota_exceeded",
    data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: "audit" },
  }, { status: 402 });
}
// ...do the heavy work...
await recordUsage(dbUser.id, "audit", { jobId });
```

The HTTP `402 Payment Required` is the canonical signal for "you've hit a paywall."

### 7.4 Checkout flow

`POST /api/billing/checkout`:

1. Auth-gate; resolve `dbUser`.
2. Read body: `{ planKey: "pro" | "team" }`.
3. If `dbUser.dodoCustomerId` is null, create a Dodo customer (or rely on Dodo's "create on checkout" — choose whichever the SDK supports cleanly).
4. Call `dodo.checkoutSessions.create({ productId, customer: { customer_id: dbUser.dodoCustomerId, email }, returnUrl: <app>/dashboard/billing?status=ok, ... })`.
5. Return `{ success: true, data: { url } }`. Client redirects.

### 7.5 Customer portal

`POST /api/billing/portal`:

1. Auth-gate.
2. Look up `subscriptions.dodoCustomerId` (or `users.dodoCustomerId`).
3. Call `dodo.customers.portalSessions.create({ customerId, returnUrl: <app>/dashboard/billing })`.
4. Return `{ success: true, data: { url } }`.

(Exact Dodo SDK method names verified during implementation against `dodopayments` package docs.)

### 7.6 Webhook receiver

`POST /api/webhooks/dodo`:

1. Read raw body.
2. Verify signature with `DODO_WEBHOOK_SECRET` per Dodo's docs.
3. Insert into `webhook_events` (provider="dodo", externalId=event.id) `ON CONFLICT DO NOTHING`. If it conflicts, return 200 immediately (already processed).
4. Dispatch on `event.type`:
   - `subscription.active` / `subscription.created` → upsert into `subscriptions`, set status=active, copy period dates.
   - `subscription.updated` → upsert (covers cancel-at-period-end flips, plan changes).
   - `subscription.cancelled` → set status=cancelled, leave period_end so user keeps Pro until then.
   - `subscription.expired` → set status=expired, drop user back to free.
   - `payment.failed` → set status=past_due.
   - `payment.succeeded` → if previously past_due, restore status=active.
5. Mirror summary fields (`tier`, `status`, `current_period_end`, `dodo_customer_id`) onto the `users` row for fast reads from middleware/proxy.
6. Return 200.

### 7.7 Pricing / billing page

`/dashboard/billing` shows:

- 3 plan cards (Free / Pro / Team). Current plan badged.
- "Upgrade" / "Switch plan" buttons → POST `/api/billing/checkout` → redirect.
- For paid users: "Manage billing" → POST `/api/billing/portal` → redirect.
- Usage breakdown (this month): audits used X/Y, chats today X/Y, applications X/Y. Read from `/api/billing/usage`.
- Renewal date if active.
- Cancellation row in the manage flow goes through Dodo portal — we don't reimplement it.

### 7.8 Upgrade modal

When any client-side code receives a `402` from a metered endpoint, it surfaces `<UpgradeModal>` with:
- Why you saw this ("You've used all 1 audit this month")
- "Upgrade to Pro" button → POST `/api/billing/checkout` with `planKey: "pro"` → redirect

The modal lives in `src/components/billing/UpgradeModal.tsx`. Two integration patterns are acceptable: (a) a Zustand store toggled from any fetch wrapper, (b) a per-page handler that mounts the modal locally. **v1: per-page handler** in the resume page and chat page. Centralized store can come later.

### 7.9 UsageChip update

`/api/billing/me` — small endpoint returning `{ planKey, status, currentPeriodEnd }` (so the chip doesn't need the full usage payload). The chip text becomes `Free plan` / `Pro` / `Team` accordingly. Pro/Team gets a subtle "•" indicator instead of upgrade-CTA wording.

### 7.10 Settings → Plan & Billing tab

Replace the "Coming soon" Profile/Billing card on `/dashboard/settings` with a card that says:

> Plan & Billing — Currently on **<PlanName>** · Renews **<date>** · [Manage] [View pricing]

Both buttons link out (Manage → `/dashboard/billing` then portal POST; View → `/dashboard/billing` direct).

## 8. Failure handling

| Failure | Behavior |
|---|---|
| Dodo API down during checkout creation | Return 503 to client; client shows "Try again in a moment" |
| Webhook signature invalid | 401, no DB write |
| Webhook handler throws | 500 — Dodo will retry (verified per their docs); the `webhook_events` insert happens BEFORE state changes, so a half-processed event will still trip the idempotency gate on retry. To avoid this, the dispatch and mirror happen inside a single Drizzle transaction with the insert; if the transaction fails the row is rolled back and Dodo's retry will succeed |
| User pays, webhook never arrives | Reconciliation: a daily Inngest cron fetches `dodo.subscriptions.list({ customer_id })` for any user with `dodoCustomerId` set and reconciles status. Out of scope for v1 happy path; keeping it in the plan as a stub function with TODO comment is allowed by the spec only because we explicitly mention the cron here; in code it's a Phase 5 ops thing |
| User on past-due endpoint hits gate | They get blocked (free quotas apply); upgrade modal CTA leads to portal to update payment method |
| `DODO_API_KEY` missing in dev | All billing routes return `{ success: false, error: "billing_not_configured" }` 503; access checker treats every user as "free" so dev still works without a Dodo account |

## 9. Tests

- `tests/billing-plans.test.ts` — `PLANS` shape, quota lookup.
- `tests/billing-access.test.ts` — `getUserPlan` for each subscription state (none, active, past_due+grace, past_due+expired, cancelled-not-yet-expired, cancelled-expired).
- `tests/billing-canuse.test.ts` — `canUse`'s quota math: free user with 0 audits → allowed; with 1 → blocked; pro user always allowed.
- `tests/billing-webhook-handlers.test.ts` — each event type → expected DB writes; idempotency (replaying an event with the same external id results in a single state change).
- `tests/billing-checkout-route.test.ts` — auth gate + 503 when Dodo not configured.

UI tests are out of scope (no Playwright). Manual smoke covers the upgrade flow.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Webhook re-delivery races with the original delivery | `webhook_events` unique constraint + transactional dispatch |
| Pro user sees themselves as Free for a few seconds after webhook lands | Optimistic client refetch on `?status=ok` query param after redirect; in steady state the chip refetches every dashboard load |
| Free user pre-loads dashboard then upgrades; gates still 402 | Refetch `/api/billing/me` on focus event in usage chip; client-side cache TTL ≤ 30s |
| Dodo SDK breaking API change | Pin major version; lockfile committed; integration tests cover the wrapper module so a breaking change surfaces in CI |
| User cancels then re-subscribes within the same period | The subscriptions row gets overwritten; period dates align with the latest active sub. The `raw` jsonb captures full history if forensics needed |
| Quota race (two requests at the same time) | We accept ±1 over-usage. Strict counting requires DB-level locking which is overkill for retention SaaS |

## 11. Rollout

1. Sign up for Dodo Payments. Create the Pro and Team products in their dashboard. Copy product IDs.
2. Set env vars in `.env.local`: `DODO_API_KEY`, `DODO_WEBHOOK_SECRET`, `DODO_PRO_PRODUCT_ID`, `DODO_TEAM_PRODUCT_ID`, `DODO_ENV=test_mode|live_mode`. Add to `docs/VERCEL_ENV_CHECKLIST.md`.
3. Apply schema migration (`drizzle-kit push`).
4. Deploy preview. Verify checkout button redirects to Dodo test-mode checkout.
5. Use Dodo test card → complete checkout → webhook fires → DB updated → user becomes Pro.
6. Hit a metered endpoint as a fresh free user, exceed quota, see 402; upgrade flow restores.
7. Cancel via portal → confirm `status=cancelled`, user still Pro until period end.
8. Configure webhook endpoint in Dodo dashboard → `https://your-app/api/webhooks/dodo`.
9. Promote to prod. Switch `DODO_ENV` to `live_mode`. Set live API key, live webhook secret.

## 12. Open questions

None blocking. Two minor decisions documented inline:
- Team plan v1 has identical features to Pro (no team admin UI). This is intentional — early signal.
- Reconciliation cron is acknowledged as Phase 5 ops; not built in 3.

---

**Next step after approval:** invoke `writing-plans` to break Phase 3 into tasks.
