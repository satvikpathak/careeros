# Phase 3 — Dodo Payments Billing & Usage Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Dodo Payments hosted checkout + customer portal + webhooks to a quota-gated subscription system; meter heavy endpoints, surface upgrade modals, ship a `/dashboard/billing` page.

**Architecture:** A pure plan-catalog module drives quotas and pricing. `getUserPlan` reads from a `subscriptions` table mirrored from Dodo webhooks (signature-verified, idempotent via `webhook_events`). Heavy endpoints call `canUse` before work and `recordUsage` on success, writing to an append-only `usage_events` table. Without `DODO_API_KEY`, the system runs in dev-fallback mode where everyone is on Free.

**Tech Stack:** Next.js 16 · `dodopayments` v2 · Drizzle/Neon · Vitest. Adds 1 new dep.

**Hard constraints:**
- Landing page + 3D cloud — UNTOUCHED.
- All UI uses Phase 1 monochrome tokens.
- Branch: `phase-3-dodo-billing`, stacked on `phase-2b-tracker-checkin-email`.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/lib/billing/plans.ts` | Pure plan catalog + types |
| `src/lib/billing/dodo.ts` | Dodo SDK client + customer/checkout/portal helpers |
| `src/lib/billing/access.ts` | `getUserPlan`, `canUse`, `recordUsage` |
| `src/lib/billing/webhook-handlers.ts` | Pure DB-mutating handlers per Dodo event type |
| `src/app/api/billing/checkout/route.ts` | POST → Dodo checkout URL |
| `src/app/api/billing/portal/route.ts` | POST → customer portal URL |
| `src/app/api/billing/usage/route.ts` | GET → current usage breakdown |
| `src/app/api/billing/me/route.ts` | GET → plan summary for the chip/header |
| `src/app/api/webhooks/dodo/route.ts` | Webhook receiver |
| `src/app/dashboard/billing/page.tsx` | Pricing + current plan + usage |
| `src/components/billing/PlanCard.tsx` | Plan comparison card primitive |
| `src/components/billing/UpgradeModal.tsx` | Modal shown on 402 |

### Modified files

| Path | Why |
|---|---|
| `package.json` | add `dodopayments` |
| `src/db/schema.ts` | add `subscriptions`, `usageEvents`, `webhookEvents` + 3 columns on `users` |
| `src/app/api/audit/start/route.ts` | gate via `canUse("audit")` + `recordUsage` |
| `src/app/api/chat/route.ts` | gate via `canUse("chat")` + `recordUsage` |
| `src/app/api/roadmap/route.ts` | gate via `canUse("roadmap")` + `recordUsage` |
| `src/app/api/sprint/generate/route.ts` | gate via `canUse("sprint_regen")` + `recordUsage` |
| `src/components/ui/usage-chip.tsx` | read real plan from `/api/billing/me` |
| `src/app/dashboard/client-layout.tsx` | add `/dashboard/billing` to nav |
| `src/app/dashboard/settings/page.tsx` | replace "Coming soon" with Plan & Billing card |
| `src/app/dashboard/resume/page.tsx` | mount `<UpgradeModal>` on 402 from `/api/audit/start` |
| `src/app/dashboard/chat/page.tsx` | mount `<UpgradeModal>` on 402 from `/api/chat` |
| `docs/VERCEL_ENV_CHECKLIST.md` | document Dodo env vars |

---

## Task Index

1. Install `dodopayments`
2. Schema migration (3 tables + 3 user columns)
3. Plan catalog
4. Dodo client wrapper
5. Access helpers (`getUserPlan`, `canUse`, `recordUsage`)
6. Webhook handlers (pure)
7. Webhook receiver route
8. Checkout route
9. Portal route
10. Usage route + me route
11. UpgradeModal primitive
12. PlanCard primitive
13. Billing page (`/dashboard/billing`)
14. UsageChip → live plan label
15. Gate audit-start endpoint
16. Gate chat endpoint
17. Gate roadmap + sprint endpoints
18. Resume + chat page upgrade-modal wiring
19. Settings page → Plan & Billing card
20. Nav + env checklist + final verification

---

### Task 1: Install Dodo SDK

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

```bash
npm install dodopayments
```

- [ ] **Step 2: Smoke check**

```bash
node -e "require('dodopayments'); console.log('OK')"
```

Expected: prints `OK`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add dodopayments SDK"
```

---

### Task 2: Schema migration

**Files:**
- Modify: `src/db/schema.ts`
- Create: `tests/schema-phase3.test.ts`
- Generate: `drizzle/0002_phase3.sql`

- [ ] **Step 1: Failing test**

Create `tests/schema-phase3.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { subscriptions, usageEvents, webhookEvents, users } from "@/db/schema";

describe("phase 3 schema", () => {
  it("subscriptions has required columns", () => {
    const cols = Object.keys(subscriptions);
    for (const c of ["id", "userId", "dodoSubscriptionId", "dodoCustomerId", "planKey", "status", "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd", "raw", "createdAt", "updatedAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("usageEvents has required columns", () => {
    const cols = Object.keys(usageEvents);
    for (const c of ["id", "userId", "kind", "occurredAt", "metadata"]) {
      expect(cols).toContain(c);
    }
  });

  it("webhookEvents has required columns", () => {
    const cols = Object.keys(webhookEvents);
    for (const c of ["id", "provider", "externalId", "eventType", "receivedAt", "payload"]) {
      expect(cols).toContain(c);
    }
  });

  it("users has billing columns", () => {
    const cols = Object.keys(users);
    for (const c of ["dodoCustomerId", "subscriptionStatus", "currentPeriodEnd"]) {
      expect(cols).toContain(c);
    }
  });
});
```

`npm test -- schema-phase3` — must FAIL.

- [ ] **Step 2: Update `src/db/schema.ts`**

In the `users` pgTable, add (right before `createdAt`):

```ts
dodoCustomerId: varchar("dodo_customer_id", { length: 255 }),
subscriptionStatus: varchar("subscription_status", { length: 30 }),
currentPeriodEnd: timestamp("current_period_end"),
```

Append at the END of the file:

```ts
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull().unique(),
    dodoSubscriptionId: varchar("dodo_subscription_id", { length: 255 }).notNull(),
    dodoCustomerId: varchar("dodo_customer_id", { length: 255 }).notNull(),
    planKey: varchar("plan_key", { length: 50 }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    kind: varchar("kind", { length: 50 }).notNull(),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
    metadata: jsonb("metadata"),
  }
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: serial("id").primaryKey(),
    provider: varchar("provider", { length: 30 }).notNull(),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    receivedAt: timestamp("received_at").defaultNow(),
    payload: jsonb("payload"),
  },
  (t) => ({
    providerExternalUnique: uniqueIndex("webhook_events_provider_external_unique").on(t.provider, t.externalId),
  })
);
```

`npm test -- schema-phase3` — must PASS.

- [ ] **Step 3: Generate migration**

```bash
DATABASE_URL=postgresql://placeholder:placeholder@localhost/placeholder npx drizzle-kit generate
```

Expect a new SQL file under `drizzle/` (e.g. `0002_xxxxx.sql`). Inspect: 3 CREATE TABLE + 3 ALTER TABLE users ADD COLUMN + 1 unique index.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/ tests/schema-phase3.test.ts
git commit -m "feat(db): add subscriptions + usage_events + webhook_events tables"
```

---

### Task 3: Plan catalog

**Files:**
- Create: `src/lib/billing/plans.ts`
- Create: `tests/billing-plans.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/billing-plans.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { PLANS, getQuota, type PlanKey } from "@/lib/billing/plans";

describe("plans", () => {
  it("has free, pro, team", () => {
    expect(PLANS.free).toBeDefined();
    expect(PLANS.pro).toBeDefined();
    expect(PLANS.team).toBeDefined();
  });

  it("free has finite audit quota", () => {
    expect(PLANS.free.quotas.auditPerMonth).toBe(1);
  });

  it("pro has infinite audits", () => {
    expect(PLANS.pro.quotas.auditPerMonth).toBe(Infinity);
  });

  it("getQuota returns numeric limit", () => {
    expect(getQuota("free", "audit")).toBe(1);
    expect(getQuota("pro", "audit")).toBe(Infinity);
    expect(getQuota("free", "chat")).toBe(20);
  });
});
```

`npm test -- billing-plans` — must FAIL.

- [ ] **Step 2: Implement**

Create `src/lib/billing/plans.ts`:

```ts
export type PlanKey = "free" | "pro" | "team";
export type UsageKind = "audit" | "chat" | "roadmap" | "sprint_regen" | "rewriter" | "cover_letter";

export interface PlanQuotas {
  auditPerMonth: number;
  chatPerDay: number;
  applicationsTracked: number;
  rewriter: boolean;
  coverLetter: boolean;
}

export interface Plan {
  key: PlanKey;
  name: string;
  priceUsd: number;
  dodoProductId: string | null;
  features: string[];
  quotas: PlanQuotas;
}

export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    name: "Free",
    priceUsd: 0,
    dodoProductId: null,
    features: [
      "1 audit per month",
      "20 AI messages per day",
      "Track up to 3 applications",
    ],
    quotas: { auditPerMonth: 1, chatPerDay: 20, applicationsTracked: 3, rewriter: false, coverLetter: false },
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceUsd: 19,
    dodoProductId: process.env.DODO_PRO_PRODUCT_ID || null,
    features: [
      "Unlimited audits",
      "Unlimited chat",
      "Unlimited applications",
      "Resume rewriter",
      "Cover letters",
    ],
    quotas: { auditPerMonth: Infinity, chatPerDay: Infinity, applicationsTracked: Infinity, rewriter: true, coverLetter: true },
  },
  team: {
    key: "team",
    name: "Team",
    priceUsd: 49,
    dodoProductId: process.env.DODO_TEAM_PRODUCT_ID || null,
    features: [
      "Everything in Pro",
      "Admin view (coming soon)",
      "Shared resources (coming soon)",
      "SSO (coming soon)",
    ],
    quotas: { auditPerMonth: Infinity, chatPerDay: Infinity, applicationsTracked: Infinity, rewriter: true, coverLetter: true },
  },
};

export function getQuota(plan: PlanKey, kind: UsageKind): number {
  const q = PLANS[plan].quotas;
  switch (kind) {
    case "audit": return q.auditPerMonth;
    case "chat": return q.chatPerDay;
    case "roadmap":
    case "sprint_regen":
      // Treated as Pro-only when not on Pro/Team. Free gets 0.
      return plan === "free" ? 0 : Infinity;
    case "rewriter": return q.rewriter ? Infinity : 0;
    case "cover_letter": return q.coverLetter ? Infinity : 0;
  }
}
```

`npm test -- billing-plans` — must PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/billing/plans.ts tests/billing-plans.test.ts
git commit -m "feat(billing): plan catalog (free/pro/team) with quotas"
```

---

### Task 4: Dodo client wrapper

**Files:**
- Create: `src/lib/billing/dodo.ts`

- [ ] **Step 1: Implement**

Note: This file uses dynamic import + try/catch because the Dodo SDK won't be initialized when `DODO_API_KEY` is missing. Reading the SDK's exact named exports may require a `node_modules/dodopayments` peek before finalizing — start with the form below; adjust `new DodoPayments(...)` to match the SDK's actual constructor if needed.

Create `src/lib/billing/dodo.ts`:

```ts
let cachedClient: any = null;

export function isDodoConfigured(): boolean {
  return Boolean(process.env.DODO_API_KEY);
}

export async function getDodo() {
  if (!isDodoConfigured()) throw new Error("billing_not_configured");
  if (cachedClient) return cachedClient;
  const mod: any = await import("dodopayments");
  // The SDK exports the class as default or named — try both shapes.
  const Ctor = mod.default ?? mod.DodoPayments ?? mod;
  cachedClient = new Ctor({
    bearerToken: process.env.DODO_API_KEY!,
    environment: process.env.DODO_ENV === "live_mode" ? "live_mode" : "test_mode",
  });
  return cachedClient;
}

/**
 * Create a checkout session URL. Returns the URL the user should be redirected to.
 */
export async function createCheckoutUrl(input: {
  productId: string;
  customer: { email: string; name?: string; customerId?: string | null };
  returnUrl: string;
  metadata?: Record<string, string>;
}): Promise<string> {
  const dodo = await getDodo();
  // Dodo SDK names: subscriptions.create or checkoutSessions.create — try the canonical form.
  // The SDK accepts product_cart and either customer (full) or customer_id (existing).
  const params: any = {
    product_cart: [{ product_id: input.productId, quantity: 1 }],
    return_url: input.returnUrl,
    payment_link: true,
    metadata: input.metadata,
    customer: input.customer.customerId
      ? { customer_id: input.customer.customerId }
      : { email: input.customer.email, name: input.customer.name ?? "" },
  };
  // Try the SDK's subscriptions.create first (subscription products)
  if (dodo.subscriptions?.create) {
    const res = await dodo.subscriptions.create(params);
    if (res?.payment_link) return res.payment_link;
    if (res?.checkout_url) return res.checkout_url;
    if (res?.url) return res.url;
  }
  throw new Error("dodo_create_checkout_failed");
}

/**
 * Create a customer portal session URL.
 */
export async function createPortalUrl(input: {
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const dodo = await getDodo();
  if (dodo.customers?.customerPortal?.create) {
    const res = await dodo.customers.customerPortal.create({
      customer_id: input.customerId,
      return_url: input.returnUrl,
    });
    if (res?.url) return res.url;
    if (res?.link) return res.link;
  }
  throw new Error("dodo_create_portal_failed");
}

/**
 * Verify a webhook signature. Throws if invalid.
 */
export async function verifyWebhook(input: {
  body: string;
  headers: Record<string, string>;
}): Promise<any> {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) throw new Error("DODO_WEBHOOK_SECRET missing");

  // Dodo uses standardwebhooks under the hood (compatible with svix). If their SDK
  // exposes Webhook.verify, use it; otherwise fall back to the standardwebhooks lib.
  try {
    const { Webhook } = await import("standardwebhooks");
    const wh = new Webhook(secret);
    return wh.verify(input.body, input.headers);
  } catch {
    // Some Dodo SDK versions ship the verifier directly:
    const dodo = await getDodo();
    if (dodo.webhooks?.verify) {
      return dodo.webhooks.verify(input.body, input.headers, secret);
    }
    throw new Error("no webhook verifier available");
  }
}
```

If `standardwebhooks` isn't installed, install it now:

```bash
npm install standardwebhooks
```

(Dodo's webhooks follow the [Standard Webhooks](https://www.standardwebhooks.com/) spec, so this lib does the verification cleanly.)

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add src/lib/billing/dodo.ts package.json package-lock.json
git commit -m "feat(billing): Dodo SDK wrapper with checkout/portal/verify helpers"
```

---

### Task 5: Access helpers

**Files:**
- Create: `src/lib/billing/access.ts`
- Create: `tests/billing-access.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/billing-access.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const findFirstSub = vi.fn();
const insertUsage = vi.fn(() => ({ values: vi.fn(() => Promise.resolve()) }));
const findManyUsage = vi.fn();

vi.mock("@/db", () => ({
  db: {
    query: {
      subscriptions: { findFirst: findFirstSub },
      usageEvents: { findMany: findManyUsage },
    },
    insert: insertUsage,
  },
}));

import { getUserPlan, canUse, recordUsage } from "@/lib/billing/access";

describe("getUserPlan", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns free when no subscription", async () => {
    findFirstSub.mockResolvedValue(null);
    expect(await getUserPlan(1)).toBe("free");
  });

  it("returns plan when active", async () => {
    findFirstSub.mockResolvedValue({ planKey: "pro", status: "active" });
    expect(await getUserPlan(1)).toBe("pro");
  });

  it("returns plan during cancellation grace (period_end in future)", async () => {
    findFirstSub.mockResolvedValue({ planKey: "pro", status: "cancelled", currentPeriodEnd: new Date(Date.now() + 86400000) });
    expect(await getUserPlan(1)).toBe("pro");
  });

  it("returns free after cancelled period_end", async () => {
    findFirstSub.mockResolvedValue({ planKey: "pro", status: "cancelled", currentPeriodEnd: new Date(Date.now() - 86400000) });
    expect(await getUserPlan(1)).toBe("free");
  });

  it("returns plan during past_due grace", async () => {
    findFirstSub.mockResolvedValue({ planKey: "pro", status: "past_due", currentPeriodEnd: new Date(Date.now() - 86400000) });
    // 7-day grace from period end
    expect(await getUserPlan(1)).toBe("pro");
  });

  it("returns free after past_due grace expires", async () => {
    findFirstSub.mockResolvedValue({ planKey: "pro", status: "past_due", currentPeriodEnd: new Date(Date.now() - 8 * 86400000) });
    expect(await getUserPlan(1)).toBe("free");
  });
});

describe("canUse", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("free user blocked after 1 audit", async () => {
    findFirstSub.mockResolvedValue(null);
    findManyUsage.mockResolvedValue([{ id: 1 }]);
    const r = await canUse(1, "audit");
    expect(r.allowed).toBe(false);
    expect(r.planKey).toBe("free");
    expect(r.limit).toBe(1);
    expect(r.used).toBe(1);
  });

  it("free user allowed at 0 audits", async () => {
    findFirstSub.mockResolvedValue(null);
    findManyUsage.mockResolvedValue([]);
    const r = await canUse(1, "audit");
    expect(r.allowed).toBe(true);
  });

  it("pro user always allowed", async () => {
    findFirstSub.mockResolvedValue({ planKey: "pro", status: "active" });
    findManyUsage.mockResolvedValue(new Array(1000).fill({}));
    const r = await canUse(1, "audit");
    expect(r.allowed).toBe(true);
  });
});
```

`npm test -- billing-access` — must FAIL.

- [ ] **Step 2: Implement**

Create `src/lib/billing/access.ts`:

```ts
import { db } from "@/db";
import { subscriptions, usageEvents } from "@/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { PLANS, getQuota, type PlanKey, type UsageKind } from "./plans";

const PAST_DUE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export async function getUserPlan(userId: number): Promise<PlanKey> {
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) });
  if (!sub) return "free";

  const status = sub.status;
  const planKey = sub.planKey as PlanKey;

  if (status === "active" || status === "trialing") return planKey;

  if (status === "past_due") {
    const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
    if (!periodEnd) return "free";
    const graceEnd = new Date(periodEnd.getTime() + PAST_DUE_GRACE_MS);
    return graceEnd > new Date() ? planKey : "free";
  }

  if (status === "cancelled") {
    const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
    if (periodEnd && periodEnd > new Date()) return planKey;
    return "free";
  }

  return "free";
}

export interface QuotaResult {
  allowed: boolean;
  planKey: PlanKey;
  used: number;
  limit: number;
  reason?: string;
}

function windowStart(kind: UsageKind): Date {
  const now = new Date();
  if (kind === "chat") {
    // Today (UTC)
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  // 30-day rolling window for audit and others
  return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

export async function canUse(userId: number, kind: UsageKind): Promise<QuotaResult> {
  const plan = await getUserPlan(userId);
  const limit = getQuota(plan, kind);

  if (limit === Infinity) {
    return { allowed: true, planKey: plan, used: 0, limit: Infinity };
  }
  if (limit === 0) {
    return { allowed: false, planKey: plan, used: 0, limit: 0, reason: `${kind} not in your plan` };
  }

  const since = windowStart(kind);
  const rows = await db.query.usageEvents.findMany({
    where: and(eq(usageEvents.userId, userId), eq(usageEvents.kind, kind), gte(usageEvents.occurredAt, since)),
  });
  const used = rows.length;

  return { allowed: used < limit, planKey: plan, used, limit };
}

export async function recordUsage(userId: number, kind: UsageKind, metadata?: Record<string, any>): Promise<void> {
  await db.insert(usageEvents).values({ userId, kind, metadata });
}
```

`npm test -- billing-access` — must PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/billing/access.ts tests/billing-access.test.ts
git commit -m "feat(billing): getUserPlan + canUse + recordUsage"
```

---

### Task 6: Webhook handlers (pure)

**Files:**
- Create: `src/lib/billing/webhook-handlers.ts`
- Create: `tests/billing-webhook-handlers.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/billing-webhook-handlers.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const findFirstUser = vi.fn();
const upsertSub = vi.fn(() => ({
  values: vi.fn(() => ({
    onConflictDoUpdate: vi.fn(() => Promise.resolve()),
  })),
}));
const updateUsers = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) }));

vi.mock("@/db", () => ({
  db: {
    query: { users: { findFirst: findFirstUser } },
    insert: upsertSub,
    update: updateUsers,
  },
}));

import { handleDodoEvent } from "@/lib/billing/webhook-handlers";

describe("handleDodoEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirstUser.mockResolvedValue({ id: 7, dodoCustomerId: "cust_abc" });
  });

  it("subscription.active upserts an active row", async () => {
    await handleDodoEvent({
      type: "subscription.active",
      data: {
        subscription_id: "sub_123",
        customer: { customer_id: "cust_abc" },
        product_id: "prod_pro",
        status: "active",
        current_period_start: "2026-05-10T00:00:00Z",
        current_period_end: "2026-06-10T00:00:00Z",
      },
    } as any);
    expect(upsertSub).toHaveBeenCalled();
    expect(updateUsers).toHaveBeenCalled();
  });

  it("subscription.cancelled writes status=cancelled", async () => {
    await handleDodoEvent({
      type: "subscription.cancelled",
      data: {
        subscription_id: "sub_123",
        customer: { customer_id: "cust_abc" },
        product_id: "prod_pro",
        status: "cancelled",
        cancel_at_period_end: true,
        current_period_end: "2026-06-10T00:00:00Z",
      },
    } as any);
    expect(upsertSub).toHaveBeenCalled();
  });

  it("payment.failed marks past_due", async () => {
    await handleDodoEvent({
      type: "payment.failed",
      data: {
        subscription_id: "sub_123",
        customer: { customer_id: "cust_abc" },
      },
    } as any);
    expect(updateUsers).toHaveBeenCalled();
  });

  it("ignores unknown event types without throwing", async () => {
    await expect(
      handleDodoEvent({ type: "unknown.thing", data: {} } as any)
    ).resolves.toBeUndefined();
  });
});
```

`npm test -- billing-webhook-handlers` — must FAIL.

- [ ] **Step 2: Implement**

Create `src/lib/billing/webhook-handlers.ts`:

```ts
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { PlanKey } from "./plans";

interface DodoEvent {
  type: string;
  data: {
    subscription_id?: string;
    customer?: { customer_id?: string };
    product_id?: string;
    status?: string;
    current_period_start?: string;
    current_period_end?: string;
    cancel_at_period_end?: boolean;
  };
}

function planKeyForProduct(productId: string | undefined): PlanKey {
  if (!productId) return "pro";
  if (productId === process.env.DODO_TEAM_PRODUCT_ID) return "team";
  return "pro";
}

async function findUserIdByDodoCustomer(dodoCustomerId: string | undefined): Promise<number | null> {
  if (!dodoCustomerId) return null;
  const u = await db.query.users.findFirst({ where: eq(users.dodoCustomerId, dodoCustomerId) });
  return u?.id ?? null;
}

async function upsertSubscription(userId: number, ev: DodoEvent, status: string) {
  const dodoSubId = ev.data.subscription_id || "";
  const dodoCustId = ev.data.customer?.customer_id || "";
  const planKey = planKeyForProduct(ev.data.product_id);
  const periodStart = ev.data.current_period_start ? new Date(ev.data.current_period_start) : null;
  const periodEnd = ev.data.current_period_end ? new Date(ev.data.current_period_end) : null;
  const cancelAtPeriodEnd = Boolean(ev.data.cancel_at_period_end);

  await db.insert(subscriptions).values({
    userId,
    dodoSubscriptionId: dodoSubId,
    dodoCustomerId: dodoCustId,
    planKey,
    status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd,
    raw: ev as any,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: subscriptions.userId,
    set: {
      dodoSubscriptionId: dodoSubId,
      dodoCustomerId: dodoCustId,
      planKey,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd,
      raw: ev as any,
      updatedAt: new Date(),
    },
  });

  await db.update(users).set({
    subscriptionTier: planKey,
    subscriptionStatus: status,
    currentPeriodEnd: periodEnd,
  }).where(eq(users.id, userId));
}

async function markUserStatus(userId: number, status: string) {
  await db.update(users).set({ subscriptionStatus: status }).where(eq(users.id, userId));
}

export async function handleDodoEvent(ev: DodoEvent): Promise<void> {
  const customerId = ev.data.customer?.customer_id;
  const userId = await findUserIdByDodoCustomer(customerId);
  if (!userId) {
    console.warn(`[dodo-webhook] no user for customer_id=${customerId} type=${ev.type}`);
    return;
  }

  switch (ev.type) {
    case "subscription.active":
    case "subscription.created":
    case "subscription.renewed":
      await upsertSubscription(userId, ev, "active");
      return;

    case "subscription.updated":
      await upsertSubscription(userId, ev, ev.data.status || "active");
      return;

    case "subscription.cancelled":
      await upsertSubscription(userId, ev, "cancelled");
      return;

    case "subscription.expired":
      await upsertSubscription(userId, ev, "expired");
      return;

    case "payment.failed":
      await markUserStatus(userId, "past_due");
      return;

    case "payment.succeeded":
      // If the user was past_due, restore active. We don't have full sub data here,
      // but flipping status is safe; subscription.updated will overwrite if needed.
      await markUserStatus(userId, "active");
      return;

    default:
      // Ignore unknown event types silently
      return;
  }
}
```

`npm test -- billing-webhook-handlers` — must PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/billing/webhook-handlers.ts tests/billing-webhook-handlers.test.ts
git commit -m "feat(billing): pure webhook handlers per Dodo event type"
```

---

### Task 7: Webhook receiver route

**Files:**
- Create: `src/app/api/webhooks/dodo/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST(req: Request) {
  if (!process.env.DODO_WEBHOOK_SECRET) {
    return NextResponse.json({ success: false, error: "billing_not_configured" }, { status: 503 });
  }

  const body = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k] = v; });

  let event: any;
  try {
    const { verifyWebhook } = await import("@/lib/billing/dodo");
    event = await verifyWebhook({ body, headers });
  } catch (err) {
    console.warn("[dodo-webhook] signature verify failed:", err);
    return NextResponse.json({ success: false, error: "invalid signature" }, { status: 401 });
  }

  // Idempotency: insert into webhook_events; if it conflicts, return 200 silently.
  const { db } = await import("@/db");
  const { webhookEvents } = await import("@/db/schema");

  const externalId = event.id || event.event_id || `${event.type}:${Date.now()}`;
  try {
    await db.insert(webhookEvents).values({
      provider: "dodo",
      externalId,
      eventType: event.type,
      payload: event,
    });
  } catch (e: any) {
    // unique violation = already processed
    if (String(e?.message || "").includes("duplicate") || e?.code === "23505") {
      return NextResponse.json({ success: true, deduped: true });
    }
    throw e;
  }

  try {
    const { handleDodoEvent } = await import("@/lib/billing/webhook-handlers");
    await handleDodoEvent(event);
  } catch (err) {
    console.error("[dodo-webhook] handler failed:", err);
    return NextResponse.json({ success: false, error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/app/api/webhooks/dodo
git commit -m "feat(billing): Dodo webhook receiver with idempotency"
```

---

### Task 8: Checkout route

**Files:**
- Create: `src/app/api/billing/checkout/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST(req: NextRequest) {
  const { isDodoConfigured } = await import("@/lib/billing/dodo");
  if (!isDodoConfigured()) {
    return NextResponse.json({ success: false, error: "billing_not_configured" }, { status: 503 });
  }

  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  const clerk = await currentUser();
  if (!clerkId || !clerk) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const planKey = body.planKey as "pro" | "team";
  if (!["pro", "team"].includes(planKey)) {
    return NextResponse.json({ success: false, error: "Invalid planKey" }, { status: 400 });
  }

  const { PLANS } = await import("@/lib/billing/plans");
  const productId = PLANS[planKey].dodoProductId;
  if (!productId) {
    return NextResponse.json({ success: false, error: "plan_product_id_missing" }, { status: 503 });
  }

  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const email = clerk.emailAddresses[0]?.emailAddress;
  if (!email) return NextResponse.json({ success: false, error: "No email" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const returnUrl = `${appUrl}/dashboard/billing?status=ok`;

  try {
    const { createCheckoutUrl } = await import("@/lib/billing/dodo");
    const url = await createCheckoutUrl({
      productId,
      customer: {
        email,
        name: `${clerk.firstName || ""} ${clerk.lastName || ""}`.trim(),
        customerId: dbUser.dodoCustomerId,
      },
      returnUrl,
      metadata: { userId: String(dbUser.id), planKey },
    });
    return NextResponse.json({ success: true, data: { url } });
  } catch (err) {
    console.error("checkout failed:", err);
    return NextResponse.json({ success: false, error: "checkout_failed" }, { status: 502 });
  }
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/app/api/billing/checkout
git commit -m "feat(billing): POST /api/billing/checkout creates Dodo session"
```

---

### Task 9: Portal route

**Files:**
- Create: `src/app/api/billing/portal/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST() {
  const { isDodoConfigured } = await import("@/lib/billing/dodo");
  if (!isDodoConfigured()) {
    return NextResponse.json({ success: false, error: "billing_not_configured" }, { status: 503 });
  }

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser?.dodoCustomerId) {
    return NextResponse.json({ success: false, error: "No Dodo customer on file" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const { createPortalUrl } = await import("@/lib/billing/dodo");
    const url = await createPortalUrl({
      customerId: dbUser.dodoCustomerId,
      returnUrl: `${appUrl}/dashboard/billing`,
    });
    return NextResponse.json({ success: true, data: { url } });
  } catch (err) {
    console.error("portal failed:", err);
    return NextResponse.json({ success: false, error: "portal_failed" }, { status: 502 });
  }
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/app/api/billing/portal
git commit -m "feat(billing): POST /api/billing/portal returns customer portal URL"
```

---

### Task 10: Usage + me routes

**Files:**
- Create: `src/app/api/billing/usage/route.ts`
- Create: `src/app/api/billing/me/route.ts`

- [ ] **Step 1: `me` route**

Create `src/app/api/billing/me/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function GET() {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: true, data: { planKey: "free", status: null, currentPeriodEnd: null } });

  const { getUserPlan } = await import("@/lib/billing/access");
  const planKey = await getUserPlan(dbUser.id);

  return NextResponse.json({
    success: true,
    data: {
      planKey,
      status: dbUser.subscriptionStatus ?? null,
      currentPeriodEnd: dbUser.currentPeriodEnd ?? null,
      hasDodoCustomer: Boolean(dbUser.dodoCustomerId),
    },
  });
}
```

- [ ] **Step 2: `usage` route**

Create `src/app/api/billing/usage/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function GET() {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: true, data: null });

  const { canUse } = await import("@/lib/billing/access");

  const [audit, chat] = await Promise.all([
    canUse(dbUser.id, "audit"),
    canUse(dbUser.id, "chat"),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      planKey: audit.planKey,
      audit: { used: audit.used, limit: audit.limit },
      chat: { used: chat.used, limit: chat.limit },
    },
  });
}
```

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/app/api/billing/usage src/app/api/billing/me
git commit -m "feat(billing): GET /api/billing/me + /api/billing/usage"
```

---

### Task 11: UpgradeModal primitive

**Files:** `src/components/billing/UpgradeModal.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  recommendedPlan?: "pro" | "team";
}

export function UpgradeModal({ open, onOpenChange, reason, recommendedPlan = "pro" }: UpgradeModalProps) {
  const [submitting, setSubmitting] = React.useState(false);

  const upgrade = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planKey: recommendedPlan }),
      });
      const j = await res.json();
      if (j.success && j.data?.url) {
        window.location.href = j.data.url;
      } else {
        alert(j.error || "Checkout unavailable. Try again later.");
        setSubmitting(false);
      }
    } catch {
      alert("Network error. Try again.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neutral-700" />
            Upgrade to Pro
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">{reason}</p>
          <ul className="space-y-1 text-sm text-neutral-700">
            <li>• Unlimited audits</li>
            <li>• Unlimited AI chat</li>
            <li>• Resume rewriter</li>
            <li>• Cover letters</li>
          </ul>
          <p className="text-2xl font-semibold text-neutral-950">$19<span className="text-sm font-normal text-neutral-500">/mo</span></p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Maybe later</Button>
            <Button onClick={upgrade} disabled={submitting}>
              {submitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Upgrade
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/components/billing/UpgradeModal.tsx
git commit -m "feat(billing): UpgradeModal primitive with one-click checkout"
```

---

### Task 12: PlanCard primitive

**Files:** `src/components/billing/PlanCard.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  name: string;
  priceUsd: number;
  features: string[];
  isCurrent: boolean;
  ctaLabel: string;
  ctaDisabled?: boolean;
  highlighted?: boolean;
  onCta?: () => void | Promise<void>;
}

export function PlanCard({ name, priceUsd, features, isCurrent, ctaLabel, ctaDisabled, highlighted, onCta }: PlanCardProps) {
  const [busy, setBusy] = React.useState(false);

  const click = async () => {
    if (!onCta) return;
    setBusy(true);
    try { await onCta(); } finally { setBusy(false); }
  };

  return (
    <Card className={cn("p-6 relative", highlighted && "border-neutral-950")}>
      {highlighted && (
        <span className="absolute -top-2 left-6 rounded-full bg-neutral-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Recommended</span>
      )}
      <h3 className="text-lg font-semibold text-neutral-950">{name}</h3>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950 tabular-nums">
        ${priceUsd}<span className="text-sm font-normal text-neutral-500">/mo</span>
      </p>
      <ul className="mt-5 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-neutral-950" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        {isCurrent ? (
          <Button variant="outline" disabled className="w-full">Current plan</Button>
        ) : (
          <Button onClick={click} disabled={busy || ctaDisabled} className="w-full">
            {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            {ctaLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/components/billing/PlanCard.tsx
git commit -m "feat(billing): PlanCard primitive"
```

---

### Task 13: Billing page

**Files:** `src/app/dashboard/billing/page.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { PlanCard } from "@/components/billing/PlanCard";

const PLAN_DEFS = [
  {
    key: "free",
    name: "Free",
    priceUsd: 0,
    features: ["1 audit per month", "20 AI messages per day", "Track up to 3 applications"],
  },
  {
    key: "pro",
    name: "Pro",
    priceUsd: 19,
    features: ["Unlimited audits", "Unlimited AI chat", "Unlimited applications", "Resume rewriter", "Cover letters"],
  },
  {
    key: "team",
    name: "Team",
    priceUsd: 49,
    features: ["Everything in Pro", "Admin view (coming soon)", "Shared resources (coming soon)", "SSO (coming soon)"],
  },
];

export default function BillingPage() {
  const [me, setMe] = React.useState<any>(null);
  const [usage, setUsage] = React.useState<any>(null);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/billing/me", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/billing/usage", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([m, u]) => {
      if (m.success) setMe(m.data);
      if (u.success) setUsage(u.data);
    });
  }, []);

  const checkout = async (planKey: "pro" | "team") => {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ planKey }),
    });
    const j = await res.json();
    if (j.success && j.data?.url) window.location.href = j.data.url;
    else alert(j.error || "Checkout unavailable");
  };

  const portal = async () => {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const j = await res.json();
    if (j.success && j.data?.url) window.location.href = j.data.url;
    else alert(j.error || "Portal unavailable");
  };

  if (!me) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const planKey = me.planKey as "free" | "pro" | "team";

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Billing"
        title="Plan & usage"
        description={planKey === "free"
          ? "Choose a plan to unlock the full toolkit."
          : `You're on ${planKey === "pro" ? "Pro" : "Team"}.${me.currentPeriodEnd ? ` Renews ${new Date(me.currentPeriodEnd).toLocaleDateString()}.` : ""}`}
        actions={planKey !== "free" ? <Button variant="outline" onClick={portal}>Manage billing</Button> : undefined}
      />

      {usage && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-neutral-950 mb-3">Usage this period</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <UsageRow label="Audits" used={usage.audit.used} limit={usage.audit.limit} />
            <UsageRow label="AI messages today" used={usage.chat.used} limit={usage.chat.limit} />
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_DEFS.map((p) => (
          <PlanCard
            key={p.key}
            name={p.name}
            priceUsd={p.priceUsd}
            features={p.features}
            isCurrent={planKey === p.key}
            highlighted={p.key === "pro"}
            ctaLabel={p.key === "free" ? "Free forever" : `Choose ${p.name}`}
            ctaDisabled={p.key === "free"}
            onCta={p.key === "free" ? undefined : () => checkout(p.key as "pro" | "team")}
          />
        ))}
      </div>
    </div>
  );
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit === Infinity ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const limitText = limit === Infinity ? "∞" : limit;
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-center justify-between text-xs text-neutral-600">
        <span>{label}</span>
        <span><span className="font-semibold text-neutral-950">{used}</span> / {limitText}</span>
      </div>
      {limit !== Infinity && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
          <div className="h-full bg-neutral-950" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/billing
git commit -m "feat(billing): /dashboard/billing page with plans + usage"
```

---

### Task 14: UsageChip → live plan label

**Files:** `src/components/ui/usage-chip.tsx`

- [ ] **Step 1: Modify**

Replace the entire file with:

```tsx
"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  team: "Team",
};

interface UsageChipProps {
  className?: string;
}

export function UsageChip({ className }: UsageChipProps) {
  const [planKey, setPlanKey] = React.useState<string>("free");

  React.useEffect(() => {
    fetch("/api/billing/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setPlanKey(j.data.planKey); })
      .catch(() => {});
  }, []);

  return (
    <Link
      href="/dashboard/billing"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      {LABELS[planKey] ?? "Free"} plan
    </Link>
  );
}
```

(The old `planLabel` and `href` props are removed — call sites already pass nothing or rely on defaults; check `client-layout.tsx` and remove any no-longer-needed prop.)

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/components/ui/usage-chip.tsx
git commit -m "feat(billing): usage chip reads live plan from /api/billing/me"
```

---

### Task 15: Gate audit-start endpoint

**Files:** `src/app/api/audit/start/route.ts`

- [ ] **Step 1: Read the file**

Locate where the function authenticates `dbUser` (after `syncUserWithNeon`). Just before the S3 upload block, insert the gate. After the `auditJobs` insert, record usage.

- [ ] **Step 2: Add gate**

After this line in the file:
```ts
const dbUser = await syncUserWithNeon(clerkId, ...);
```

Insert:
```ts
const { canUse, recordUsage } = await import("@/lib/billing/access");
const quota = await canUse(dbUser.id, "audit");
if (!quota.allowed) {
  return NextResponse.json({
    success: false,
    error: "quota_exceeded",
    data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: "audit" },
  }, { status: 402 });
}
```

After the `auditJobs.values(...).returning()` insert (where `[job]` is destructured), add:
```ts
await recordUsage(dbUser.id, "audit", { jobId: job.id });
```

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/app/api/audit/start/route.ts
git commit -m "feat(billing): gate /api/audit/start with quota check"
```

---

### Task 16: Gate chat endpoint

**Files:** `src/app/api/chat/route.ts`

- [ ] **Step 1: Read the file**

Locate the existing POST handler. It probably auth-gates already; if not, add a Clerk auth lookup.

- [ ] **Step 2: Add gate**

Near the top of the POST handler, after auth resolution and `dbUser` fetch (or after determining the user from Clerk if no DB sync exists in this route), insert:

```ts
const { auth } = await import("@clerk/nextjs/server");
const { userId: clerkId } = await auth();
if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

const { db } = await import("@/db");
const { users } = await import("@/db/schema");
const { eq } = await import("drizzle-orm");
const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

const { canUse, recordUsage } = await import("@/lib/billing/access");
const quota = await canUse(dbUser.id, "chat");
if (!quota.allowed) {
  return NextResponse.json({
    success: false,
    error: "quota_exceeded",
    data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: "chat" },
  }, { status: 402 });
}
```

If the chat route already does its auth in a different shape, integrate the gate after the existing auth check rather than duplicating.

After the Gemini call returns successfully (and before `NextResponse.json({...success...})`), insert:

```ts
await recordUsage(dbUser.id, "chat");
```

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/app/api/chat/route.ts
git commit -m "feat(billing): gate /api/chat with quota check"
```

---

### Task 17: Gate roadmap + sprint endpoints

**Files:** `src/app/api/roadmap/route.ts`, `src/app/api/sprint/generate/route.ts`

- [ ] **Step 1: Roadmap**

Read `src/app/api/roadmap/route.ts`. Apply the same pattern as Task 16 but with `kind: "roadmap"`:

```ts
const quota = await canUse(dbUser.id, "roadmap");
if (!quota.allowed) {
  return NextResponse.json({
    success: false,
    error: "quota_exceeded",
    data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: "roadmap" },
  }, { status: 402 });
}
```

After the Gemini work succeeds:
```ts
await recordUsage(dbUser.id, "roadmap");
```

Note: roadmap and sprint_regen quotas in the catalog return `Infinity` for Pro/Team and `0` for Free, so free users will be blocked immediately. That's the correct intent.

- [ ] **Step 2: Sprint**

Same pattern in `src/app/api/sprint/generate/route.ts` with `kind: "sprint_regen"`.

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/app/api/roadmap/route.ts src/app/api/sprint/generate/route.ts
git commit -m "feat(billing): gate /api/roadmap + /api/sprint/generate"
```

---

### Task 18: Resume + chat page upgrade-modal wiring

**Files:** `src/app/dashboard/resume/page.tsx`, `src/app/dashboard/chat/page.tsx`

- [ ] **Step 1: Resume page**

Read the file. Find the place where `/api/audit/start` is called (the submit handler). Add an UpgradeModal state and trigger it on 402.

Add to imports:
```tsx
import { UpgradeModal } from "@/components/billing/UpgradeModal";
```

Inside the component near other useState calls:
```tsx
const [upgradeOpen, setUpgradeOpen] = React.useState(false);
const [upgradeReason, setUpgradeReason] = React.useState("");
```

In the submit handler, when checking the response from `/api/audit/start`:
```tsx
if (res.status === 402) {
  setUpgradeReason(`You've used all ${json.data.limit} audit${json.data.limit === 1 ? "" : "s"} this month.`);
  setUpgradeOpen(true);
  setUploading(false);
  setParsing(false);
  return;
}
```

Place this BEFORE the existing `if (!json.success) ...` branch, so 402 is handled distinctly.

In the JSX (anywhere — typically at the end of the returned JSX), mount:
```tsx
<UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} />
```

- [ ] **Step 2: Chat page**

Same treatment in `src/app/dashboard/chat/page.tsx` — find where `/api/chat` is called, add 402 handling that opens an `<UpgradeModal>`. Use a chat-appropriate reason: `"You've sent ${json.data.used} of ${json.data.limit} AI messages today."`.

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/resume/page.tsx src/app/dashboard/chat/page.tsx
git commit -m "feat(billing): UpgradeModal on 402 in resume + chat pages"
```

---

### Task 19: Settings → Plan & Billing card

**Files:** `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Modify**

Read the file. Locate the "Coming soon" card at the bottom (currently shows "Profile · Plan & Billing · Coming soon"). Replace that single Card with two cards:

```tsx
<Card className="p-6">
  <p className="font-semibold text-neutral-950 mb-1">Plan & Billing</p>
  <p className="text-sm text-neutral-500 mb-4">Manage your subscription, view usage, change plans.</p>
  <div className="flex gap-2">
    <Button asChild variant="outline" size="sm">
      <Link href="/dashboard/billing">View pricing</Link>
    </Button>
  </div>
</Card>

<Card className="p-6 text-sm text-neutral-500">
  <p className="font-semibold text-neutral-950 mb-1">Profile</p>
  <p>Coming soon.</p>
</Card>
```

Add to imports:
```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/settings/page.tsx
git commit -m "feat(settings): Plan & Billing card linking to /dashboard/billing"
```

---

### Task 20: Nav + env checklist + final verification

**Files:**
- Modify: `src/app/dashboard/client-layout.tsx`
- Modify: `docs/VERCEL_ENV_CHECKLIST.md`

- [ ] **Step 1: Nav**

In `src/app/dashboard/client-layout.tsx`'s `navLinks` array, add `{ href: "/dashboard/billing", label: "Billing" }` immediately AFTER Settings (or wherever feels natural — near the end is fine). Final order: ..., AI Interview, Settings, Billing.

(Alternative: place Billing in Settings only and skip the nav link. Current spec says nav is fine.)

- [ ] **Step 2: Env checklist**

Modify `docs/VERCEL_ENV_CHECKLIST.md`. Add a new "Billing (Phase 3)" section after the existing optional section:

```markdown
## Billing (Phase 3 — Dodo Payments)
- `DODO_API_KEY` — Dodo API key. Without it, billing routes return 503 and all users are treated as Free.
- `DODO_WEBHOOK_SECRET` — Standard Webhooks signing secret from the Dodo dashboard.
- `DODO_PRO_PRODUCT_ID` — Dodo product ID for Pro plan.
- `DODO_TEAM_PRODUCT_ID` — Dodo product ID for Team plan.
- `DODO_ENV` — `test_mode` (default) or `live_mode`.
- `NEXT_PUBLIC_APP_URL` — Used for return URLs after Dodo redirects (e.g. `https://careeros.app`).

After deploy, register the webhook endpoint in the Dodo dashboard:
- URL: `https://your-app/api/webhooks/dodo`
- Events: `subscription.active`, `subscription.created`, `subscription.updated`, `subscription.cancelled`, `subscription.expired`, `subscription.renewed`, `payment.succeeded`, `payment.failed`
```

- [ ] **Step 3: Test suite**

```bash
npm test
```

Expected: 4 new suites added by Phase 3 (schema-phase3, billing-plans, billing-access, billing-webhook-handlers) plus all prior suites pass. Should be ~67+ tests now.

- [ ] **Step 4: TS + lint**

```bash
npx tsc --noEmit
npm run lint
```

Both clean.

- [ ] **Step 5: Apply migration to dev DB**

```bash
set -a && source .env && set +a && npx drizzle-kit push
```

- [ ] **Step 6: Local smoke**

```bash
npm run dev
```

Without Dodo env vars set:
- Visit `/dashboard/billing` → page renders, plan = Free, "Choose Pro" button shows.
- Click "Choose Pro" → alert: `billing_not_configured` (expected; no DODO_API_KEY).
- Hit `/dashboard/resume` and try to upload an audit. After 1 successful audit, retry → see `<UpgradeModal>` open with "You've used all 1 audit this month."

With Dodo env vars set (test mode):
- Click "Choose Pro" → redirected to Dodo hosted checkout.
- Use test card → redirected back to `/dashboard/billing?status=ok`.
- Webhook fires → DB updated → refresh → "Current plan" badge on Pro.
- Verify webhook idempotency by replaying an event in Dodo dashboard.

- [ ] **Step 7: Commit + push**

```bash
git add src/app/dashboard/client-layout.tsx docs/VERCEL_ENV_CHECKLIST.md
git commit -m "feat(nav): add Billing link + document Dodo env vars"
git push -u origin phase-3-dodo-billing
```

---

## Self-review

**Spec coverage:**

| Spec section | Tasks |
|---|---|
| §4 architecture | all |
| §5 schema | 2 |
| §6 plan catalog | 3 |
| §7.1 getUserPlan | 5 |
| §7.2 canUse / recordUsage | 5 |
| §7.3 server-side gate pattern | 15, 16, 17 |
| §7.4 checkout | 8 |
| §7.5 portal | 9 |
| §7.6 webhook | 6, 7 |
| §7.7 billing page | 13 |
| §7.8 upgrade modal | 11, 18 |
| §7.9 usage chip | 14 |
| §7.10 settings card | 19 |
| §11 rollout | 20 |

Coverage clean.

**Placeholder scan:** No "TBD" / "implement later" / "add error handling". Tasks 4, 8, 9 acknowledge that exact Dodo SDK shapes may need final verification against installed package — that's a "verify, don't guess" instruction, not a placeholder; the code provided is concrete with reasonable fallback.

**Type consistency:** `PlanKey`, `UsageKind`, `QuotaResult`, `getUserPlan`, `canUse`, `recordUsage` referenced consistently across Tasks 3, 5, 15-17. `dodoCustomerId` lookup pattern consistent across handlers. `subscriptions.userId` unique constraint matches the upsert target in webhook handlers.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-10-phase-3-dodo-billing.md`.**
