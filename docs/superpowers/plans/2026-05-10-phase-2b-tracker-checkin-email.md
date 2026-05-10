# Phase 2B — Application Tracker, Daily Check-in, Email Digests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three independent retention features — application tracker (Kanban), daily check-in widget, and Resend-powered email digests — on top of the Phase 2A audit foundation.

**Architecture:** Three new tables (`applications`, `daily_checkins`, `email_subscriptions`) and three feature slices that share UI primitives but no logic. The tracker uses `@dnd-kit` for drag-drop. Streak is server-derived from `daily_checkins`, cached in `users.streakCount`. Emails go through Resend with a Clerk webhook for sign-up, an in-runner trigger for audit completion, and an Inngest cron for the Monday digest. React Email for templates. All changes are additive and post-login.

**Tech Stack:** Next.js 16 · Drizzle/Neon · Inngest · Resend · React Email · @dnd-kit · Vitest. Adds 5 new deps.

**Hard constraints:**
- `src/app/page.tsx`, 3D cloud — UNTOUCHED.
- All UI uses Phase 1 monochrome tokens.
- Branch: `phase-2b-tracker-checkin-email`, stacked on `phase-2a-async-audit-onboarding`.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/components/ui/switch.tsx` | Radix Switch primitive (monochrome) |
| `src/lib/applications/repo.ts` | Tracker DB layer (CRUD + stale query) |
| `src/lib/applications/stale.ts` | Pure stale-rule predicate |
| `src/lib/checkin/streak.ts` | Server-derived streak + record helper |
| `src/lib/email/resend.ts` | Resend client + sendEmail wrapper |
| `src/lib/email/subscriptions.ts` | Read/write `email_subscriptions` |
| `src/lib/email/templates/welcome.tsx` | React Email welcome template |
| `src/lib/email/templates/audit-complete.tsx` | React Email audit-complete template |
| `src/lib/email/templates/weekly-digest.tsx` | React Email weekly digest |
| `src/lib/jobs/email-functions.ts` | Inngest functions: welcome, audit-complete, weekly-digest, weekly-digest-cron |
| `src/app/api/applications/route.ts` | GET list, POST create |
| `src/app/api/applications/[id]/route.ts` | PATCH, DELETE |
| `src/app/api/checkin/route.ts` | POST today's check-in |
| `src/app/api/email/subscriptions/route.ts` | GET, PATCH |
| `src/app/api/email/test/route.ts` | POST test send for current user |
| `src/app/api/webhooks/clerk/route.ts` | Clerk user.created webhook |
| `src/app/dashboard/applications/page.tsx` | Kanban page |
| `src/components/applications/KanbanColumn.tsx` | Column primitive |
| `src/components/applications/ApplicationCard.tsx` | Card primitive |
| `src/components/applications/SaveToTrackerButton.tsx` | Button on jobs page |
| `src/components/dashboard/CheckinWidget.tsx` | Daily check-in card |
| `src/components/dashboard/NeedsAttentionWidget.tsx` | Stale apps widget |
| `src/app/dashboard/settings/page.tsx` | Settings shell + Notifications tab |

### Modified files

| Path | Why |
|---|---|
| `package.json` | add `@dnd-kit/core`, `@dnd-kit/sortable`, `resend`, `react`, `@react-email/components`, `@react-email/render`, `svix` |
| `src/db/schema.ts` | add 3 tables + indexes |
| `src/lib/jobs/inngest.ts` | register new email functions |
| `src/lib/audit/runner.ts` | emit `email/audit-complete` event after `done` |
| `src/app/dashboard/page.tsx` | mount `CheckinWidget` + `NeedsAttentionWidget`; remove static streak badge |
| `src/app/dashboard/jobs/page.tsx` | add `SaveToTrackerButton` per card |
| `src/app/dashboard/client-layout.tsx` | add Applications + Settings nav links |

---

## Task Index

1. Install deps (@dnd-kit, resend, react-email, svix)
2. Schema migration (applications + daily_checkins + email_subscriptions)
3. Switch primitive
4. Applications repo (DB layer)
5. Applications routes (`GET`/`POST`/`PATCH`/`DELETE`)
6. Kanban page + column + card primitives
7. SaveToTrackerButton + integrate in `/dashboard/jobs`
8. NeedsAttentionWidget on `/dashboard`
9. Streak helper
10. Check-in route
11. CheckinWidget on `/dashboard` + remove old streak badge
12. Email subscriptions module + route
13. Resend wrapper + test route
14. React Email templates (welcome, audit-complete, weekly-digest)
15. Email Inngest functions + register
16. Hook audit-complete email into runner
17. Clerk webhook for welcome email
18. Settings page (Notifications tab)
19. Nav link integration
20. Final verification + push

---

### Task 1: Install dependencies

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities resend react-email @react-email/components @react-email/render svix
```

- [ ] **Step 2: Smoke check imports**

```bash
node -e "require('@dnd-kit/core'); require('resend'); require('@react-email/components'); require('svix'); console.log('OK')"
```

Expected: prints `OK`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add @dnd-kit, resend, react-email, svix for Phase 2B"
```

---

### Task 2: Schema migration

**Files:**
- Modify: `src/db/schema.ts`
- Create: `tests/schema-phase2b.test.ts`
- Generate: `drizzle/0001_phase2b.sql`

- [ ] **Step 1: Failing test**

Create `tests/schema-phase2b.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { applications, dailyCheckins, emailSubscriptions } from "@/db/schema";

describe("phase 2B schema", () => {
  it("applications has required columns", () => {
    const cols = Object.keys(applications);
    for (const c of ["id", "userId", "jobTitle", "company", "location", "sourceUrl", "jobSnapshot", "status", "notes", "appliedAt", "nextActionAt", "createdAt", "updatedAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("dailyCheckins has required columns", () => {
    const cols = Object.keys(dailyCheckins);
    for (const c of ["id", "userId", "checkinDate", "summary", "applicationsSent", "hoursStudied", "createdAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("emailSubscriptions has required columns", () => {
    const cols = Object.keys(emailSubscriptions);
    for (const c of ["id", "userId", "kind", "enabled", "updatedAt"]) {
      expect(cols).toContain(c);
    }
  });
});
```

`npm test -- schema-phase2b` — must FAIL.

- [ ] **Step 2: Update `src/db/schema.ts`**

Append at the end of the file:

```ts
import { uniqueIndex } from "drizzle-orm/pg-core";

export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    jobTitle: varchar("job_title", { length: 512 }).notNull(),
    company: varchar("company", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }),
    sourceUrl: varchar("source_url", { length: 1024 }),
    jobSnapshot: jsonb("job_snapshot"),
    status: varchar("status", { length: 30 }).notNull().default("saved"),
    notes: text("notes"),
    appliedAt: timestamp("applied_at"),
    nextActionAt: timestamp("next_action_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const dailyCheckins = pgTable(
  "daily_checkins",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    checkinDate: varchar("checkin_date", { length: 10 }).notNull(),
    summary: text("summary"),
    applicationsSent: integer("applications_sent").default(0),
    hoursStudied: decimal("hours_studied", { precision: 4, scale: 1 }).default("0"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userDateUnique: uniqueIndex("daily_checkins_user_date_unique").on(t.userId, t.checkinDate),
  })
);

export const emailSubscriptions = pgTable(
  "email_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    kind: varchar("kind", { length: 50 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    userKindUnique: uniqueIndex("email_subscriptions_user_kind_unique").on(t.userId, t.kind),
  })
);
```

`npm test -- schema-phase2b` — must PASS.

- [ ] **Step 3: Generate migration**

```bash
DATABASE_URL=postgresql://placeholder:placeholder@localhost/placeholder npx drizzle-kit generate
```

Expect a new SQL file under `drizzle/` (named like `0001_xxxxx.sql`). Inspect: 3 CREATE TABLE statements + 2 unique indexes.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/ tests/schema-phase2b.test.ts
git commit -m "feat(db): add applications + daily_checkins + email_subscriptions tables"
```

---

### Task 3: Switch primitive

**Files:** `src/components/ui/switch.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

interface SwitchProps extends React.ComponentProps<typeof SwitchPrimitive.Root> {}

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-neutral-300 transition-colors data-[state=checked]:bg-neutral-950 data-[state=checked]:border-neutral-950 data-[state=unchecked]:bg-white disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=checked]:bg-white data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-neutral-300"
      />
    </SwitchPrimitive.Root>
  );
}
```

If `@radix-ui/react-switch` isn't already installed, run:

```bash
npm install @radix-ui/react-switch
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add src/components/ui/switch.tsx package.json package-lock.json
git commit -m "feat(ui): monochrome Switch primitive"
```

---

### Task 4: Applications repo + stale predicate

**Files:**
- Create: `src/lib/applications/stale.ts`
- Create: `src/lib/applications/repo.ts`
- Create: `tests/applications-stale.test.ts`
- Create: `tests/applications-repo.test.ts`

- [ ] **Step 1: Stale predicate failing test**

Create `tests/applications-stale.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isStale } from "@/lib/applications/stale";

describe("isStale", () => {
  const now = new Date("2026-05-10T00:00:00Z");

  it("saved is stale after 7d", () => {
    const updatedAt = new Date("2026-05-02T00:00:00Z");
    expect(isStale("saved", updatedAt, now)).toBe(true);
  });

  it("saved is fresh at 6d", () => {
    const updatedAt = new Date("2026-05-04T00:00:00Z");
    expect(isStale("saved", updatedAt, now)).toBe(false);
  });

  it("interview stale at 4d", () => {
    const updatedAt = new Date("2026-05-06T00:00:00Z");
    expect(isStale("interview", updatedAt, now)).toBe(true);
  });

  it("offer is never stale", () => {
    const updatedAt = new Date("2025-01-01T00:00:00Z");
    expect(isStale("offer", updatedAt, now)).toBe(false);
  });

  it("rejected is never stale", () => {
    const updatedAt = new Date("2025-01-01T00:00:00Z");
    expect(isStale("rejected", updatedAt, now)).toBe(false);
  });

  it("withdrawn is never stale", () => {
    const updatedAt = new Date("2025-01-01T00:00:00Z");
    expect(isStale("withdrawn", updatedAt, now)).toBe(false);
  });
});
```

`npm test -- applications-stale` — must FAIL.

- [ ] **Step 2: Implement stale predicate**

Create `src/lib/applications/stale.ts`:

```ts
export type ApplicationStatus =
  | "saved"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

const STALE_DAYS: Partial<Record<ApplicationStatus, number>> = {
  saved: 7,
  applied: 10,
  screening: 5,
  interview: 3,
};

export function isStale(status: ApplicationStatus, updatedAt: Date, now: Date = new Date()): boolean {
  const threshold = STALE_DAYS[status];
  if (threshold === undefined) return false;
  const ageMs = now.getTime() - updatedAt.getTime();
  return ageMs >= threshold * 24 * 60 * 60 * 1000;
}
```

`npm test -- applications-stale` — must PASS (6).

- [ ] **Step 3: Repo failing test**

Create `tests/applications-repo.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: { applications: { findMany: vi.fn(), findFirst: vi.fn() } },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 1 }])) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 1, status: "applied" }])) })) })) })),
    delete: vi.fn(() => ({ where: vi.fn() })),
  },
}));

import { listApplications, createApplication, updateApplication, deleteApplication } from "@/lib/applications/repo";
import { db } from "@/db";

describe("applications repo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listApplications calls findMany scoped by userId", async () => {
    (db.query.applications.findMany as any).mockResolvedValue([{ id: 1, userId: 7 }]);
    const rows = await listApplications(7);
    expect(rows.length).toBe(1);
    expect((db.query.applications.findMany as any)).toHaveBeenCalled();
  });

  it("createApplication inserts with status=saved", async () => {
    await createApplication(7, { jobTitle: "Eng", company: "Acme" });
    expect((db.insert as any)).toHaveBeenCalled();
  });

  it("updateApplication runs an update", async () => {
    await updateApplication(7, 1, { status: "applied" });
    expect((db.update as any)).toHaveBeenCalled();
  });

  it("deleteApplication runs a delete", async () => {
    await deleteApplication(7, 1);
    expect((db.delete as any)).toHaveBeenCalled();
  });
});
```

`npm test -- applications-repo` — must FAIL.

- [ ] **Step 4: Implement repo**

Create `src/lib/applications/repo.ts`:

```ts
import { db } from "@/db";
import { applications } from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import type { ApplicationStatus } from "./stale";
import { isStale } from "./stale";

export type { ApplicationStatus };

export async function listApplications(userId: number) {
  return db.query.applications.findMany({
    where: eq(applications.userId, userId),
    orderBy: [desc(applications.updatedAt)],
  });
}

export async function createApplication(
  userId: number,
  input: { jobTitle: string; company: string; location?: string; sourceUrl?: string; jobSnapshot?: any }
) {
  const [row] = await db.insert(applications).values({
    userId,
    jobTitle: input.jobTitle,
    company: input.company,
    location: input.location,
    sourceUrl: input.sourceUrl,
    jobSnapshot: input.jobSnapshot,
    status: "saved",
  }).returning();
  return row;
}

export async function updateApplication(
  userId: number,
  id: number,
  patch: Partial<{ status: ApplicationStatus; notes: string; nextActionAt: Date | null }>
) {
  const next: any = { ...patch, updatedAt: new Date() };
  if (patch.status === "applied") next.appliedAt = new Date();

  const [row] = await db.update(applications)
    .set(next)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)))
    .returning();
  return row;
}

export async function deleteApplication(userId: number, id: number) {
  await db.delete(applications)
    .where(and(eq(applications.id, id), eq(applications.userId, userId)));
}

export async function listStaleApplications(userId: number) {
  const all = await listApplications(userId);
  const now = new Date();
  return all.filter((a) => isStale(a.status as ApplicationStatus, a.updatedAt ?? a.createdAt ?? now, now));
}
```

`npm test -- applications-repo` — must PASS (4).

- [ ] **Step 5: Commit**

```bash
git add src/lib/applications tests/applications-stale.test.ts tests/applications-repo.test.ts
git commit -m "feat(applications): repo + stale predicate"
```

---

### Task 5: Applications API routes

**Files:**
- Create: `src/app/api/applications/route.ts`
- Create: `src/app/api/applications/[id]/route.ts`
- Create: `tests/applications-route.test.ts`

- [ ] **Step 1: Route auth-test failing**

Create `tests/applications-route.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: { applications: { findFirst: vi.fn() }, users: { findFirst: vi.fn() } },
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 1, status: "applied" }])) })) })) })),
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "clerk-123" })),
}));

import { PATCH } from "@/app/api/applications/[id]/route";
import { db } from "@/db";

describe("PATCH /api/applications/[id]", () => {
  it("returns 403 for cross-user update", async () => {
    (db.query.users.findFirst as any).mockResolvedValue({ id: 1, clerkId: "clerk-123" });
    (db.query.applications.findFirst as any).mockResolvedValue({ id: 9, userId: 999 });

    const req = new Request("http://localhost/api/applications/9", {
      method: "PATCH",
      body: JSON.stringify({ status: "applied" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req as any, { params: Promise.resolve({ id: "9" }) });
    expect(res.status).toBe(403);
  });
});
```

`npm test -- applications-route` — must FAIL.

- [ ] **Step 2: Implement collection route**

Create `src/app/api/applications/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

async function getDbUser() {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  return db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
}

export async function GET() {
  const dbUser = await getDbUser();
  if (!dbUser) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { listApplications } = await import("@/lib/applications/repo");
  const rows = await listApplications(dbUser.id);
  return NextResponse.json({ success: true, data: rows });
}

export async function POST(req: NextRequest) {
  const dbUser = await getDbUser();
  if (!dbUser) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.jobTitle || !body.company) {
    return NextResponse.json({ success: false, error: "jobTitle and company required" }, { status: 400 });
  }
  const { createApplication } = await import("@/lib/applications/repo");
  const row = await createApplication(dbUser.id, {
    jobTitle: body.jobTitle,
    company: body.company,
    location: body.location,
    sourceUrl: body.sourceUrl,
    jobSnapshot: body.jobSnapshot,
  });
  return NextResponse.json({ success: true, data: row });
}
```

- [ ] **Step 3: Implement item route**

Create `src/app/api/applications/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

async function loadOwnedApp(idStr: string) {
  const id = Number(idStr);
  if (!Number.isFinite(id)) return { error: "Invalid id", status: 400 as const };

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized", status: 401 as const };

  const { db } = await import("@/db");
  const { applications, users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return { error: "Unknown user", status: 401 as const };

  const row = await db.query.applications.findFirst({ where: eq(applications.id, id) });
  if (!row) return { error: "Not found", status: 404 as const };
  if (row.userId !== dbUser.id) return { error: "Forbidden", status: 403 as const };

  return { dbUserId: dbUser.id, id };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const owned = await loadOwnedApp(idStr);
  if ("error" in owned) return NextResponse.json({ success: false, error: owned.error }, { status: owned.status });

  const body = await req.json().catch(() => ({}));
  const { updateApplication } = await import("@/lib/applications/repo");
  const row = await updateApplication(owned.dbUserId, owned.id, body);
  return NextResponse.json({ success: true, data: row });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const owned = await loadOwnedApp(idStr);
  if ("error" in owned) return NextResponse.json({ success: false, error: owned.error }, { status: owned.status });

  const { deleteApplication } = await import("@/lib/applications/repo");
  await deleteApplication(owned.dbUserId, owned.id);
  return NextResponse.json({ success: true });
}
```

`npm test -- applications-route` — must PASS.

- [ ] **Step 4: Commit**

```bash
npx tsc --noEmit
git add src/app/api/applications tests/applications-route.test.ts
git commit -m "feat(api): applications CRUD with auth gates"
```

---

### Task 6: Kanban page + column + card primitives

**Files:**
- Create: `src/components/applications/ApplicationCard.tsx`
- Create: `src/components/applications/KanbanColumn.tsx`
- Create: `src/app/dashboard/applications/page.tsx`

- [ ] **Step 1: ApplicationCard**

Create `src/components/applications/ApplicationCard.tsx`:

```tsx
"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Building2, MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApplicationCardProps {
  app: {
    id: number;
    jobTitle: string;
    company: string;
    location?: string | null;
    sourceUrl?: string | null;
    updatedAt?: Date | string | null;
  };
}

export function ApplicationCard({ app }: ApplicationCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const updated = app.updatedAt ? new Date(app.updatedAt) : null;
  const ageDays = updated ? Math.floor((Date.now() - updated.getTime()) / (24 * 60 * 60 * 1000)) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-lg border border-neutral-200 bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-neutral-300"
      )}
    >
      <p className="text-sm font-semibold text-neutral-950 line-clamp-2">{app.jobTitle}</p>
      <div className="mt-2 flex items-center gap-1 text-xs text-neutral-600">
        <Building2 className="h-3 w-3" />
        <span className="truncate">{app.company}</span>
      </div>
      {app.location && (
        <div className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{app.location}</span>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-400">
        <span>{ageDays !== null ? `${ageDays}d ago` : "—"}</span>
        {app.sourceUrl && (
          <a
            href={app.sourceUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 hover:text-neutral-700"
            onClick={(e) => e.stopPropagation()}
          >
            View <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: KanbanColumn**

Create `src/components/applications/KanbanColumn.tsx`:

```tsx
"use client";

import * as React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ApplicationCard } from "./ApplicationCard";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: string;
  title: string;
  apps: any[];
}

export function KanbanColumn({ id, title, apps }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-neutral-200 bg-neutral-50 p-3 transition-colors",
        isOver && "bg-neutral-100"
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
        <span className="rounded-full bg-white border border-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">{apps.length}</span>
      </div>
      <SortableContext items={apps.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[60px]">
          {apps.map((a) => <ApplicationCard key={a.id} app={a} />)}
        </div>
      </SortableContext>
    </div>
  );
}
```

- [ ] **Step 3: Kanban page**

Create `src/app/dashboard/applications/page.tsx`:

```tsx
"use client";

import * as React from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { Loader2 } from "lucide-react";
import { KanbanColumn } from "@/components/applications/KanbanColumn";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";

const COLUMNS: { id: string; title: string }[] = [
  { id: "saved", title: "Saved" },
  { id: "applied", title: "Applied" },
  { id: "screening", title: "Screening" },
  { id: "interview", title: "Interview" },
];

const TERMINAL = ["offer", "rejected", "withdrawn"] as const;

export default function ApplicationsPage() {
  const [loading, setLoading] = React.useState(true);
  const [apps, setApps] = React.useState<any[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  React.useEffect(() => {
    fetch("/api/applications", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setApps(j.data); })
      .finally(() => setLoading(false));
  }, []);

  const grouped = React.useMemo(() => {
    const out: Record<string, any[]> = { saved: [], applied: [], screening: [], interview: [] };
    const closed: any[] = [];
    for (const a of apps) {
      if ((TERMINAL as readonly string[]).includes(a.status)) closed.push(a);
      else (out[a.status] ?? out.saved).push(a);
    }
    return { active: out, closed };
  }, [apps]);

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const appId = Number(active.id);
    const newStatus = String(over.id);
    const current = apps.find((a) => a.id === appId);
    if (!current || current.status === newStatus) return;

    setApps((prev) => prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a));
    try {
      await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      setApps((prev) => prev.map((a) => a.id === appId ? { ...a, status: current.status } : a));
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Save jobs from the Jobs page to start tracking them here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader title="Applications" description={`${apps.length} on file`} />

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((c) => (
            <KanbanColumn key={c.id} id={c.id} title={c.title} apps={grouped.active[c.id] || []} />
          ))}
        </div>
      </DndContext>

      {grouped.closed.length > 0 && (
        <details className="rounded-xl border border-neutral-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-700">Closed ({grouped.closed.length})</summary>
          <ul className="mt-3 divide-y divide-neutral-200">
            {grouped.closed.map((a) => (
              <li key={a.id} className="py-2 text-sm">
                <span className="font-medium text-neutral-950">{a.jobTitle}</span>
                <span className="ml-2 text-neutral-500">— {a.company} · {a.status}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
```

- [ ] **Step 4: TS check + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/applications src/components/applications
git commit -m "feat(applications): Kanban page with drag-drop status updates"
```

---

### Task 7: SaveToTrackerButton + integration

**Files:**
- Create: `src/components/applications/SaveToTrackerButton.tsx`
- Modify: `src/app/dashboard/jobs/page.tsx`

- [ ] **Step 1: Implement button**

Create `src/components/applications/SaveToTrackerButton.tsx`:

```tsx
"use client";

import * as React from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SaveToTrackerButtonProps {
  job: {
    title: string;
    company: string;
    location?: string;
    url?: string;
    description?: string;
  };
}

export function SaveToTrackerButton({ job }: SaveToTrackerButtonProps) {
  const [state, setState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async () => {
    setState("saving");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobTitle: job.title,
          company: job.company,
          location: job.location,
          sourceUrl: job.url,
          jobSnapshot: job,
        }),
      });
      const j = await res.json();
      setState(j.success ? "saved" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "saved") {
    return (
      <Button size="sm" variant="outline" disabled>
        <BookmarkCheck className="mr-1 h-3 w-3" /> Saved
      </Button>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={save} disabled={state === "saving"}>
      {state === "saving" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Bookmark className="mr-1 h-3 w-3" />}
      Save
    </Button>
  );
}
```

- [ ] **Step 2: Wire into `/dashboard/jobs/page.tsx`**

Read the existing file. Find each rendered job card. Locate the "View on" / external-link button area. Add a `<SaveToTrackerButton job={job} />` adjacent to it. The exact prop names depend on the file's job object shape — pass `title`, `company`, `location`, `url`, `description` (the file already uses similar fields).

Add to imports:
```tsx
import { SaveToTrackerButton } from "@/components/applications/SaveToTrackerButton";
```

- [ ] **Step 3: TS check + commit**

```bash
npx tsc --noEmit
git add src/components/applications/SaveToTrackerButton.tsx src/app/dashboard/jobs/page.tsx
git commit -m "feat(jobs): Save to tracker button on each job card"
```

---

### Task 8: NeedsAttentionWidget

**Files:**
- Create: `src/components/dashboard/NeedsAttentionWidget.tsx`
- Modify: `src/app/dashboard/page.tsx` (mount widget in right column)
- Create: `src/app/api/applications/stale/route.ts` (server endpoint that returns stale rows)

- [ ] **Step 1: Stale endpoint**

Create `src/app/api/applications/stale/route.ts`:

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
  if (!dbUser) return NextResponse.json({ success: true, data: [] });

  const { listStaleApplications } = await import("@/lib/applications/repo");
  const rows = await listStaleApplications(dbUser.id);
  return NextResponse.json({ success: true, data: rows.slice(0, 5) });
}
```

- [ ] **Step 2: Widget**

Create `src/components/dashboard/NeedsAttentionWidget.tsx`:

```tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export function NeedsAttentionWidget() {
  const [items, setItems] = React.useState<any[] | null>(null);

  React.useEffect(() => {
    fetch("/api/applications/stale", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setItems(j.success ? j.data : []));
  }, []);

  if (items === null) return null;
  if (items.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-neutral-950">Needs attention</h3>
        <p className="mt-1 text-xs text-neutral-500">Nothing's stuck. Nice.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-neutral-950">Needs attention</h3>
      </div>
      <ul className="space-y-2">
        {items.map((a) => (
          <li key={a.id} className="text-xs">
            <Link href="/dashboard/applications" className="block rounded-md p-2 hover:bg-neutral-50">
              <p className="font-medium text-neutral-950 truncate">{a.jobTitle}</p>
              <p className="text-neutral-500 truncate">{a.company} · {a.status}</p>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/dashboard/applications" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-950">
        View all <ArrowRight className="h-3 w-3" />
      </Link>
    </Card>
  );
}
```

- [ ] **Step 3: Mount on `/dashboard/page.tsx`**

Add the import:
```tsx
import { NeedsAttentionWidget } from "@/components/dashboard/NeedsAttentionWidget";
```

In the right-column area of `/dashboard/page.tsx` (the part rendering the "Live Activity" card), insert `<NeedsAttentionWidget />` right above the activity card so it appears at the top of the right rail.

- [ ] **Step 4: Commit**

```bash
npx tsc --noEmit
git add src/components/dashboard/NeedsAttentionWidget.tsx src/app/api/applications/stale src/app/dashboard/page.tsx
git commit -m "feat(dashboard): Needs attention widget for stale applications"
```

---

### Task 9: Streak helper

**Files:**
- Create: `src/lib/checkin/streak.ts`
- Create: `tests/streak.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/streak.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeStreakDays, todayUtcDate } from "@/lib/checkin/streak";

describe("computeStreakDays", () => {
  it("returns 0 for no rows", () => {
    expect(computeStreakDays([], "2026-05-10")).toBe(0);
  });

  it("returns 1 when only today is checked in", () => {
    expect(computeStreakDays(["2026-05-10"], "2026-05-10")).toBe(1);
  });

  it("returns 3 for today + 2 previous days", () => {
    expect(computeStreakDays(["2026-05-08", "2026-05-09", "2026-05-10"], "2026-05-10")).toBe(3);
  });

  it("breaks on a 1-day gap", () => {
    expect(computeStreakDays(["2026-05-07", "2026-05-09", "2026-05-10"], "2026-05-10")).toBe(2);
  });

  it("counts streak ending yesterday when today is missing", () => {
    expect(computeStreakDays(["2026-05-08", "2026-05-09"], "2026-05-10")).toBe(2);
  });
});

describe("todayUtcDate", () => {
  it("returns YYYY-MM-DD", () => {
    expect(todayUtcDate(new Date("2026-05-10T15:30:00Z"))).toBe("2026-05-10");
  });
});
```

`npm test -- streak` — must FAIL.

- [ ] **Step 2: Implement**

Create `src/lib/checkin/streak.ts`:

```ts
import { db } from "@/db";
import { dailyCheckins, users } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

export function todayUtcDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function dateMinusDays(yyyymmdd: string, days: number): string {
  const d = new Date(yyyymmdd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Walk back from `today`. If today is checked in, count it.
 * If today is missing, start counting from yesterday.
 * Stop at the first gap.
 */
export function computeStreakDays(checkinDates: string[], today: string): number {
  const set = new Set(checkinDates);
  let streak = 0;
  let cursor = set.has(today) ? today : dateMinusDays(today, 1);
  if (!set.has(cursor)) return 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = dateMinusDays(cursor, 1);
  }
  return streak;
}

export interface CheckinResult {
  streakDays: number;
  checkedInToday: boolean;
}

export async function getStreak(userId: number, now: Date = new Date()): Promise<CheckinResult> {
  const today = todayUtcDate(now);
  const rows = await db.query.dailyCheckins.findMany({
    where: eq(dailyCheckins.userId, userId),
    orderBy: [desc(dailyCheckins.checkinDate)],
    limit: 365,
  });
  const dates = rows.map((r) => r.checkinDate);
  return {
    streakDays: computeStreakDays(dates, today),
    checkedInToday: dates.includes(today),
  };
}

export async function recordCheckin(
  userId: number,
  input: { summary?: string; applicationsSent?: number; hoursStudied?: number } = {},
  now: Date = new Date()
): Promise<CheckinResult> {
  const today = todayUtcDate(now);

  const existing = await db.query.dailyCheckins.findFirst({
    where: and(eq(dailyCheckins.userId, userId), eq(dailyCheckins.checkinDate, today)),
  });

  if (!existing) {
    await db.insert(dailyCheckins).values({
      userId,
      checkinDate: today,
      summary: input.summary,
      applicationsSent: input.applicationsSent ?? 0,
      hoursStudied: input.hoursStudied !== undefined ? String(input.hoursStudied) : "0",
    });
  } else if (input.summary || input.applicationsSent !== undefined || input.hoursStudied !== undefined) {
    await db.update(dailyCheckins)
      .set({
        summary: input.summary ?? existing.summary,
        applicationsSent: input.applicationsSent ?? existing.applicationsSent,
        hoursStudied: input.hoursStudied !== undefined ? String(input.hoursStudied) : existing.hoursStudied,
      })
      .where(eq(dailyCheckins.id, existing.id));
  }

  const result = await getStreak(userId, now);
  await db.update(users).set({ streakCount: result.streakDays }).where(eq(users.id, userId));
  return result;
}
```

`npm test -- streak` — must PASS (6).

- [ ] **Step 3: Commit**

```bash
git add src/lib/checkin tests/streak.test.ts
git commit -m "feat(checkin): server-derived streak helper"
```

---

### Task 10: Check-in route

**Files:** `src/app/api/checkin/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
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
  if (!dbUser) return NextResponse.json({ success: true, data: { streakDays: 0, checkedInToday: false } });

  const { getStreak } = await import("@/lib/checkin/streak");
  const result = await getStreak(dbUser.id);
  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: NextRequest) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { recordCheckin } = await import("@/lib/checkin/streak");
  const result = await recordCheckin(dbUser.id, {
    summary: body.summary,
    applicationsSent: body.applicationsSent,
    hoursStudied: body.hoursStudied,
  });
  return NextResponse.json({ success: true, data: result });
}
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add src/app/api/checkin/route.ts
git commit -m "feat(api): GET/POST /api/checkin"
```

---

### Task 11: CheckinWidget on dashboard

**Files:**
- Create: `src/components/dashboard/CheckinWidget.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Implement widget**

```tsx
"use client";

import * as React from "react";
import { Flame, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface State {
  streakDays: number;
  checkedInToday: boolean;
}

export function CheckinWidget() {
  const [state, setState] = React.useState<State | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [appsSent, setAppsSent] = React.useState("");
  const [hours, setHours] = React.useState("");

  React.useEffect(() => {
    fetch("/api/checkin", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setState(j.data); });
  }, []);

  const checkIn = async () => {
    setSubmitting(true);
    try {
      const body: any = {};
      if (appsSent.trim()) body.applicationsSent = Number(appsSent);
      if (hours.trim()) body.hoursStudied = Number(hours);
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (j.success) setState(j.data);
    } finally {
      setSubmitting(false);
    }
  };

  if (state === null) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
            <Flame className="h-5 w-5 text-neutral-700" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Streak</p>
            <p className="text-2xl font-semibold text-neutral-950 tabular-nums">{state.streakDays} {state.streakDays === 1 ? "day" : "days"}</p>
          </div>
        </div>
        {state.checkedInToday ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
            <Check className="h-3 w-3" /> Checked in today
          </span>
        ) : (
          <Button onClick={checkIn} disabled={submitting} size="sm">
            {submitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            Check in
          </Button>
        )}
      </div>

      {!state.checkedInToday && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-neutral-500">Apps sent today</label>
            <Input value={appsSent} onChange={(e) => setAppsSent(e.target.value)} placeholder="0" type="number" min={0} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-neutral-500">Hours studied</label>
            <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="0" type="number" min={0} step={0.5} />
          </div>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Mount on dashboard, remove old streak badge**

In `/dashboard/page.tsx`:
- Add import: `import { CheckinWidget } from "@/components/dashboard/CheckinWidget";`
- Right after the `<SectionHeader />` welcome block, before the KPI grid: insert `<CheckinWidget />`.
- The `SectionHeader`'s `actions` prop currently contains a streak badge with `<Trophy>` and `<AnimatedCounter value={user.streak ...}>`. Replace the SectionHeader's `actions` prop with `actions={undefined}` (or remove the prop entirely) so the streak only lives in the widget.

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit
git add src/components/dashboard/CheckinWidget.tsx src/app/dashboard/page.tsx
git commit -m "feat(dashboard): daily check-in widget; retire static streak badge"
```

---

### Task 12: Email subscriptions module + route

**Files:**
- Create: `src/lib/email/subscriptions.ts`
- Create: `src/app/api/email/subscriptions/route.ts`
- Create: `tests/email-subscriptions.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/email-subscriptions.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: { emailSubscriptions: { findFirst: vi.fn(), findMany: vi.fn() } },
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoUpdate: vi.fn(() => Promise.resolve()) })) })),
  },
}));

import { isEnabled, EMAIL_KINDS } from "@/lib/email/subscriptions";
import { db } from "@/db";

describe("email subscriptions", () => {
  it("defaults to enabled when no row exists", async () => {
    (db.query.emailSubscriptions.findFirst as any).mockResolvedValue(null);
    expect(await isEnabled(7, "weekly_digest")).toBe(true);
  });

  it("respects existing enabled=false", async () => {
    (db.query.emailSubscriptions.findFirst as any).mockResolvedValue({ enabled: false });
    expect(await isEnabled(7, "weekly_digest")).toBe(false);
  });

  it("exports the canonical kind list", () => {
    expect(EMAIL_KINDS).toEqual(["welcome", "audit_complete", "weekly_digest", "streak_at_risk"]);
  });
});
```

`npm test -- email-subscriptions` — must FAIL.

- [ ] **Step 2: Implement**

Create `src/lib/email/subscriptions.ts`:

```ts
import { db } from "@/db";
import { emailSubscriptions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const EMAIL_KINDS = ["welcome", "audit_complete", "weekly_digest", "streak_at_risk"] as const;
export type EmailKind = typeof EMAIL_KINDS[number];

export async function isEnabled(userId: number, kind: EmailKind): Promise<boolean> {
  const row = await db.query.emailSubscriptions.findFirst({
    where: and(eq(emailSubscriptions.userId, userId), eq(emailSubscriptions.kind, kind)),
  });
  return row ? row.enabled : true;
}

export async function listSubscriptions(userId: number): Promise<Record<EmailKind, boolean>> {
  const rows = await db.query.emailSubscriptions.findMany({
    where: eq(emailSubscriptions.userId, userId),
  });
  const map: Record<string, boolean> = {};
  for (const r of rows) map[r.kind] = r.enabled;
  const out: Record<string, boolean> = {};
  for (const k of EMAIL_KINDS) out[k] = map[k] ?? true;
  return out as Record<EmailKind, boolean>;
}

export async function setSubscription(userId: number, kind: EmailKind, enabled: boolean): Promise<void> {
  await db.insert(emailSubscriptions)
    .values({ userId, kind, enabled, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [emailSubscriptions.userId, emailSubscriptions.kind],
      set: { enabled, updatedAt: new Date() },
    });
}
```

`npm test -- email-subscriptions` — must PASS (3).

- [ ] **Step 3: Implement route**

Create `src/app/api/email/subscriptions/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";
import { EMAIL_KINDS, type EmailKind } from "@/lib/email/subscriptions";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

async function getDbUserId(): Promise<number | null> {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const u = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  return u?.id ?? null;
}

export async function GET() {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const { listSubscriptions } = await import("@/lib/email/subscriptions");
  return NextResponse.json({ success: true, data: await listSubscriptions(userId) });
}

export async function PATCH(req: NextRequest) {
  const userId = await getDbUserId();
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const kind = body.kind as EmailKind;
  if (!EMAIL_KINDS.includes(kind)) {
    return NextResponse.json({ success: false, error: "Invalid kind" }, { status: 400 });
  }
  const enabled = Boolean(body.enabled);

  const { setSubscription } = await import("@/lib/email/subscriptions");
  await setSubscription(userId, kind, enabled);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Commit**

```bash
npx tsc --noEmit
git add src/lib/email/subscriptions.ts src/app/api/email/subscriptions tests/email-subscriptions.test.ts
git commit -m "feat(email): subscriptions module + GET/PATCH route"
```

---

### Task 13: Resend wrapper + test route

**Files:**
- Create: `src/lib/email/resend.ts`
- Create: `src/app/api/email/test/route.ts`
- Create: `tests/email-resend.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/email-resend.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMock = vi.fn(() => Promise.resolve({ id: "test" }));
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

vi.mock("@react-email/render", () => ({
  render: vi.fn(() => Promise.resolve("<p>html</p>")),
}));

vi.mock("@/lib/email/subscriptions", () => ({
  isEnabled: vi.fn(() => Promise.resolve(true)),
}));

import { sendEmail } from "@/lib/email/resend";
import { isEnabled } from "@/lib/email/subscriptions";

describe("sendEmail", () => {
  beforeEach(() => {
    sendMock.mockClear();
    (isEnabled as any).mockResolvedValue(true);
  });

  it("skips when RESEND_API_KEY missing", async () => {
    delete process.env.RESEND_API_KEY;
    await sendEmail({ to: "x@y.z", subject: "S", react: null as any, kind: "welcome", userId: 1 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("skips when subscription disabled", async () => {
    process.env.RESEND_API_KEY = "test";
    (isEnabled as any).mockResolvedValue(false);
    await sendEmail({ to: "x@y.z", subject: "S", react: null as any, kind: "welcome", userId: 1 });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends when configured and enabled", async () => {
    process.env.RESEND_API_KEY = "test";
    (isEnabled as any).mockResolvedValue(true);
    await sendEmail({ to: "x@y.z", subject: "S", react: null as any, kind: "welcome", userId: 1 });
    expect(sendMock).toHaveBeenCalledOnce();
  });
});
```

`npm test -- email-resend` — must FAIL.

- [ ] **Step 2: Implement wrapper**

Create `src/lib/email/resend.ts`:

```ts
import type { ReactElement } from "react";
import { isEnabled, type EmailKind } from "./subscriptions";

export interface EmailEnvelope {
  to: string;
  subject: string;
  react: ReactElement;
  kind: EmailKind;
  userId: number;
}

export async function sendEmail(envelope: EmailEnvelope): Promise<{ skipped?: string; id?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] skipping ${envelope.kind} → ${envelope.to}: no RESEND_API_KEY`);
    return { skipped: "no_api_key" };
  }

  if (!(await isEnabled(envelope.userId, envelope.kind))) {
    return { skipped: "unsubscribed" };
  }

  const { Resend } = await import("resend");
  const { render } = await import("@react-email/render");
  const html = await render(envelope.react);
  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from: process.env.RESEND_FROM || "CareerOS <onboarding@resend.dev>",
    to: envelope.to,
    subject: envelope.subject,
    html,
    headers: {
      "List-Unsubscribe": `<${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings>`,
    },
  });

  return { id: (result as any)?.data?.id };
}
```

`npm test -- email-resend` — must PASS (3).

- [ ] **Step 3: Implement test send route**

Create `src/app/api/email/test/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST() {
  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  const clerk = await currentUser();
  if (!clerkId || !clerk) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const email = clerk.emailAddresses[0]?.emailAddress;
  if (!email) return NextResponse.json({ success: false, error: "No email on file" }, { status: 400 });

  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const { sendEmail } = await import("@/lib/email/resend");
  const { WelcomeEmail } = await import("@/lib/email/templates/welcome");

  const result = await sendEmail({
    to: email,
    subject: "Welcome to CareerOS (test)",
    react: WelcomeEmail({ name: clerk.firstName || "" }),
    kind: "welcome",
    userId: dbUser.id,
  });
  return NextResponse.json({ success: true, data: result });
}
```

- [ ] **Step 4: Commit**

```bash
npx tsc --noEmit
git add src/lib/email/resend.ts src/app/api/email/test tests/email-resend.test.ts
git commit -m "feat(email): Resend wrapper + test route"
```

---

### Task 14: React Email templates

**Files:**
- Create: `src/lib/email/templates/welcome.tsx`
- Create: `src/lib/email/templates/audit-complete.tsx`
- Create: `src/lib/email/templates/weekly-digest.tsx`

- [ ] **Step 1: Welcome**

Create `src/lib/email/templates/welcome.tsx`:

```tsx
import * as React from "react";
import { Html, Head, Body, Container, Heading, Text, Button, Hr } from "@react-email/components";

interface WelcomeEmailProps { name?: string; }

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/onboarding`;
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#fafafa", fontFamily: "Inter, Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 32, margin: "32px auto", maxWidth: 560, border: "1px solid #e5e5e5" }}>
          <Heading style={{ color: "#0a0a0a", fontSize: 22, marginTop: 0 }}>Welcome to CareerOS{name ? `, ${name}` : ""}</Heading>
          <Text style={{ color: "#525252", fontSize: 14, lineHeight: 1.6 }}>
            Upload your resume and we&apos;ll generate your career intelligence audit in about a minute.
          </Text>
          <Button href={url} style={{ backgroundColor: "#0a0a0a", color: "#ffffff", padding: "12px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block" }}>
            Start your audit
          </Button>
          <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0" }} />
          <Text style={{ color: "#a3a3a3", fontSize: 11 }}>You&apos;re receiving this because you signed up for CareerOS. Manage email preferences in Settings.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Audit complete**

Create `src/lib/email/templates/audit-complete.tsx`:

```tsx
import * as React from "react";
import { Html, Head, Body, Container, Heading, Text, Button, Hr } from "@react-email/components";

interface AuditCompleteEmailProps {
  readinessScore: number;
  marketMatchScore: number;
  topGaps: string[];
}

export function AuditCompleteEmail({ readinessScore, marketMatchScore, topGaps }: AuditCompleteEmailProps) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`;
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#fafafa", fontFamily: "Inter, Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 32, margin: "32px auto", maxWidth: 560, border: "1px solid #e5e5e5" }}>
          <Heading style={{ color: "#0a0a0a", fontSize: 22, marginTop: 0 }}>Your audit is ready</Heading>
          <Text style={{ color: "#525252", fontSize: 14, lineHeight: 1.6 }}>
            Readiness {readinessScore}% · Market match {marketMatchScore}%
          </Text>
          {topGaps.length > 0 && (
            <>
              <Text style={{ color: "#0a0a0a", fontSize: 14, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Top skill gaps to close:</Text>
              <ul style={{ color: "#525252", fontSize: 14, paddingLeft: 20 }}>
                {topGaps.slice(0, 3).map((g) => <li key={g} style={{ marginBottom: 4 }}>{g}</li>)}
              </ul>
            </>
          )}
          <Button href={url} style={{ backgroundColor: "#0a0a0a", color: "#ffffff", padding: "12px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: 16 }}>
            Open dashboard
          </Button>
          <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0" }} />
          <Text style={{ color: "#a3a3a3", fontSize: 11 }}>Manage email preferences in Settings.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 3: Weekly digest**

Create `src/lib/email/templates/weekly-digest.tsx`:

```tsx
import * as React from "react";
import { Html, Head, Body, Container, Heading, Text, Button, Hr } from "@react-email/components";

interface WeeklyDigestEmailProps {
  streakDays: number;
  readinessDelta: number;
  staleApps: { jobTitle: string; company: string; status: string }[];
}

export function WeeklyDigestEmail({ streakDays, readinessDelta, staleApps }: WeeklyDigestEmailProps) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`;
  const sign = readinessDelta >= 0 ? "+" : "";
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#fafafa", fontFamily: "Inter, Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 32, margin: "32px auto", maxWidth: 560, border: "1px solid #e5e5e5" }}>
          <Heading style={{ color: "#0a0a0a", fontSize: 22, marginTop: 0 }}>Your week on CareerOS</Heading>
          <Text style={{ color: "#525252", fontSize: 14, lineHeight: 1.6 }}>
            Streak: <strong>{streakDays} {streakDays === 1 ? "day" : "days"}</strong> · Readiness: <strong>{sign}{readinessDelta}%</strong>
          </Text>
          {staleApps.length > 0 && (
            <>
              <Text style={{ color: "#0a0a0a", fontSize: 14, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Applications needing attention:</Text>
              <ul style={{ color: "#525252", fontSize: 14, paddingLeft: 20 }}>
                {staleApps.slice(0, 3).map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{a.jobTitle} — {a.company} ({a.status})</li>)}
              </ul>
            </>
          )}
          <Button href={url} style={{ backgroundColor: "#0a0a0a", color: "#ffffff", padding: "12px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: 16 }}>
            See your dashboard
          </Button>
          <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0" }} />
          <Text style={{ color: "#a3a3a3", fontSize: 11 }}>Manage email preferences in Settings.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 4: Commit**

```bash
npx tsc --noEmit
git add src/lib/email/templates
git commit -m "feat(email): React Email templates (welcome, audit-complete, weekly-digest)"
```

---

### Task 15: Email Inngest functions + register

**Files:**
- Create: `src/lib/jobs/email-functions.ts`
- Modify: `src/lib/jobs/inngest.ts` (register new functions)

- [ ] **Step 1: Functions**

Create `src/lib/jobs/email-functions.ts`:

```ts
import { inngest } from "./inngest";

export const sendWelcome = inngest.createFunction(
  { id: "email-welcome", retries: 2 },
  { event: "email/welcome" },
  async ({ event, step }) => {
    await step.run("send", async () => {
      const userId = event.data.userId as number;
      const { db } = await import("@/db");
      const { users } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!u || !u.email) return;
      const { sendEmail } = await import("@/lib/email/resend");
      const { WelcomeEmail } = await import("@/lib/email/templates/welcome");
      await sendEmail({
        to: u.email,
        subject: "Welcome to CareerOS",
        react: WelcomeEmail({ name: u.name ?? undefined }),
        kind: "welcome",
        userId,
      });
    });
  }
);

export const sendAuditComplete = inngest.createFunction(
  { id: "email-audit-complete", retries: 2 },
  { event: "email/audit-complete" },
  async ({ event, step }) => {
    await step.run("send", async () => {
      const { userId, auditId } = event.data as { userId: number; auditId: number };
      const { db } = await import("@/db");
      const { users, careerAudits } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!u || !u.email) return;
      const audit = await db.query.careerAudits.findFirst({ where: eq(careerAudits.id, auditId) });
      if (!audit) return;
      const { sendEmail } = await import("@/lib/email/resend");
      const { AuditCompleteEmail } = await import("@/lib/email/templates/audit-complete");
      const ats = (audit.atsKeywordAnalysis as any) || {};
      await sendEmail({
        to: u.email,
        subject: "Your CareerOS audit is ready",
        react: AuditCompleteEmail({
          readinessScore: audit.readinessScore ?? 0,
          marketMatchScore: audit.marketMatchScore ?? 0,
          topGaps: Array.isArray(ats.skill_gaps) ? ats.skill_gaps : [],
        }),
        kind: "audit_complete",
        userId,
      });
    });
  }
);

export const sendWeeklyDigest = inngest.createFunction(
  { id: "email-weekly-digest", retries: 2 },
  { event: "email/weekly-digest" },
  async ({ event, step }) => {
    await step.run("send", async () => {
      const userId = event.data.userId as number;
      const { db } = await import("@/db");
      const { users, careerAudits } = await import("@/db/schema");
      const { eq, desc } = await import("drizzle-orm");
      const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!u || !u.email) return;

      const last2 = await db.query.careerAudits.findMany({
        where: eq(careerAudits.userId, userId),
        orderBy: [desc(careerAudits.createdAt)],
        limit: 2,
      });
      const readinessDelta = last2.length === 2 ? (last2[0].readinessScore ?? 0) - (last2[1].readinessScore ?? 0) : 0;

      const { listStaleApplications } = await import("@/lib/applications/repo");
      const stale = await listStaleApplications(userId);
      const { getStreak } = await import("@/lib/checkin/streak");
      const { streakDays } = await getStreak(userId);

      const { sendEmail } = await import("@/lib/email/resend");
      const { WeeklyDigestEmail } = await import("@/lib/email/templates/weekly-digest");

      await sendEmail({
        to: u.email,
        subject: "Your week on CareerOS",
        react: WeeklyDigestEmail({
          streakDays,
          readinessDelta,
          staleApps: stale.slice(0, 3).map((a) => ({ jobTitle: a.jobTitle, company: a.company, status: a.status })),
        }),
        kind: "weekly_digest",
        userId,
      });
    });
  }
);

export const weeklyDigestCron = inngest.createFunction(
  { id: "email-weekly-digest-cron" },
  { cron: "0 8 * * 1" },
  async ({ step }) => {
    await step.run("fanout", async () => {
      const { db } = await import("@/db");
      const { users } = await import("@/db/schema");
      const all = await db.query.users.findMany();
      const events = all.map((u) => ({
        name: "email/weekly-digest" as const,
        data: { userId: u.id },
      }));
      if (events.length > 0) {
        await inngest.send(events);
      }
    });
  }
);
```

- [ ] **Step 2: Register**

Modify `src/lib/jobs/inngest.ts`. Find the existing `inngestFunctions` export (currently `[auditRun]`). Replace with:

```ts
import { sendWelcome, sendAuditComplete, sendWeeklyDigest, weeklyDigestCron } from "./email-functions";

export const inngestFunctions = [auditRun, sendWelcome, sendAuditComplete, sendWeeklyDigest, weeklyDigestCron];
```

(If the import would cause a circular dep with email-functions.ts, that's fine — `email-functions.ts` imports `inngest` from `./inngest`, and `inngest.ts` imports the functions from `./email-functions`. This is a one-way dep at module-init time and Inngest doesn't care about the function order.)

If circular-import issues do bite at runtime, the safer pattern is to re-export from the webhook route's `serve()` array. In that case keep `inngestFunctions = [auditRun]` and update `src/app/api/inngest/route.ts` to:

```ts
import { auditRun } from "@/lib/jobs/inngest";
import { sendWelcome, sendAuditComplete, sendWeeklyDigest, weeklyDigestCron } from "@/lib/jobs/email-functions";
// ...
export const { GET, POST, PUT } = serve({ client: inngest, functions: [auditRun, sendWelcome, sendAuditComplete, sendWeeklyDigest, weeklyDigestCron] });
```

Use whichever shape compiles.

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit
git add src/lib/jobs
git commit -m "feat(email): Inngest functions for welcome/audit-complete/weekly-digest"
```

---

### Task 16: Hook audit-complete email into runner

**Files:** Modify `src/lib/audit/runner.ts`.

- [ ] **Step 1: Emit event after `done` transition**

In `runAuditJob`, after the final `await db.update(auditJobs).set({ status: "done", ... })` block (the success path), insert:

```ts
try {
  const { isInngestConfigured } = await import("./dev-runner");
  if (isInngestConfigured()) {
    const { inngest } = await import("@/lib/jobs/inngest");
    await inngest.send({ name: "email/audit-complete", data: { userId: job.userId, auditId: savedAudit.id } });
  }
} catch (emailErr) {
  console.warn("audit-complete email enqueue failed:", emailErr);
}
```

(Wrapped in try/catch because email failure must not fail the audit job.)

- [ ] **Step 2: Commit**

```bash
npx tsc --noEmit
git add src/lib/audit/runner.ts
git commit -m "feat(email): emit audit-complete event after successful audit"
```

---

### Task 17: Clerk webhook for welcome email

**Files:** `src/app/api/webhooks/clerk/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[clerk-webhook] CLERK_WEBHOOK_SECRET missing — skipping");
    return NextResponse.json({ success: false, error: "not configured" }, { status: 503 });
  }

  const body = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let event: any;
  try {
    const { Webhook } = await import("svix");
    const wh = new Webhook(secret);
    event = wh.verify(body, headers);
  } catch {
    return NextResponse.json({ success: false, error: "invalid signature" }, { status: 401 });
  }

  if (event.type !== "user.created") {
    return NextResponse.json({ success: true, ignored: event.type });
  }

  const clerkId = event.data.id as string;
  const email = event.data.email_addresses?.[0]?.email_address as string | undefined;
  const firstName = (event.data.first_name as string | undefined) || "";
  const lastName = (event.data.last_name as string | undefined) || "";

  if (!email) return NextResponse.json({ success: false, error: "no email" }, { status: 400 });

  const { syncUserWithNeon } = await import("@/lib/user-sync");
  const dbUser = await syncUserWithNeon(clerkId, email, `${firstName} ${lastName}`.trim());

  try {
    const { isInngestConfigured } = await import("@/lib/audit/dev-runner");
    if (isInngestConfigured()) {
      const { inngest } = await import("@/lib/jobs/inngest");
      await inngest.send({ name: "email/welcome", data: { userId: dbUser.id } });
    }
  } catch (e) {
    console.warn("welcome email enqueue failed", e);
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Update proxy.ts to mark webhook public**

Read `src/proxy.ts`. Add `"/api/webhooks(.*)"` to the existing `isPublicRoute` matcher list (it's already there from Phase 2A — confirm). If `/api/webhooks(.*)` is already in the list, no change needed.

- [ ] **Step 3: Commit**

```bash
npx tsc --noEmit
git add src/app/api/webhooks/clerk src/proxy.ts
git commit -m "feat(webhooks): Clerk user.created -> sync + welcome email"
```

---

### Task 18: Settings page

**Files:** `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SectionHeader } from "@/components/ui/section-header";

const KIND_LABELS: Record<string, { title: string; description: string }> = {
  welcome: { title: "Welcome email", description: "Sent once when you sign up." },
  audit_complete: { title: "Audit complete", description: "When your career audit finishes." },
  weekly_digest: { title: "Weekly digest", description: "Monday morning summary of your progress." },
  streak_at_risk: { title: "Streak at risk", description: "Reminder if you haven't checked in." },
};

export default function SettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [subs, setSubs] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    fetch("/api/email/subscriptions", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setSubs(j.data); })
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (kind: string, enabled: boolean) => {
    const prev = subs[kind];
    setSubs((s) => ({ ...s, [kind]: enabled }));
    try {
      const res = await fetch("/api/email/subscriptions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, enabled }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSubs((s) => ({ ...s, [kind]: prev }));
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Settings" title="Notifications" description="Choose which emails CareerOS sends you." />

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      ) : (
        <Card>
          <ul className="divide-y divide-neutral-200">
            {Object.entries(KIND_LABELS).map(([kind, meta]) => (
              <li key={kind} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-neutral-950">{meta.title}</p>
                  <p className="text-xs text-neutral-500">{meta.description}</p>
                </div>
                <Switch checked={subs[kind] ?? true} onCheckedChange={(v: boolean) => toggle(kind, v)} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-6 text-sm text-neutral-500">
        <p className="font-semibold text-neutral-950 mb-1">Profile · Plan & Billing</p>
        <p>Coming soon.</p>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/settings
git commit -m "feat(settings): notifications tab with email subscription toggles"
```

---

### Task 19: Nav link integration

**Files:** Modify `src/app/dashboard/client-layout.tsx`.

- [ ] **Step 1: Add nav links**

In the `navLinks` array, add `{ href: "/dashboard/applications", label: "Applications" }` and `{ href: "/dashboard/settings", label: "Settings" }`. Place Applications right after Jobs; place Settings at the end (after AI Interview).

- [ ] **Step 2: Commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/client-layout.tsx
git commit -m "feat(nav): add Applications and Settings to dashboard nav"
```

---

### Task 20: Final verification + push

- [ ] **Step 1: Test suite**

```bash
npm test
```

Expected: all 13+ test suites passing (5 from Phase 1, 6 from Phase 2A, 5+ new in 2B).

- [ ] **Step 2: TS + lint**

```bash
npx tsc --noEmit
npm run lint
```

Both clean.

- [ ] **Step 3: Apply migration to dev DB (manual user step — document in commit message)**

```bash
set -a && source .env && set +a && npx drizzle-kit push
```

Confirm 3 new tables (`applications`, `daily_checkins`, `email_subscriptions`) exist via:

```bash
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename\`.then(r => console.log(r.map(x => x.tablename)));
"
```

- [ ] **Step 4: Local smoke**

```bash
npm run dev
```

Manual checklist (no Inngest / Resend keys required for these):
- Visit `/dashboard/applications` → empty state.
- Visit `/dashboard/jobs` → see "Save" button on a card → click → no error.
- Visit `/dashboard/applications` → card appears in Saved column.
- Drag the card to Applied → status updates (refresh to confirm persistence).
- On `/dashboard` → see CheckinWidget at top + NeedsAttentionWidget in right column.
- Click "Check in" → streak goes to 1, button changes to "Checked in today".
- Visit `/dashboard/settings` → toggles render. Flip one — page should not reload, toggle stays.

Email checks (only with `RESEND_API_KEY` set):
- POST `/api/email/test` with curl while signed in → check inbox for welcome template.

- [ ] **Step 5: Push**

```bash
git push -u origin phase-2b-tracker-checkin-email
```

---

## Self-review

**Spec coverage:**

| Spec section | Tasks |
|---|---|
| §4 architecture | 1-19 |
| §5 schema | 2 |
| §6.1 application tracker | 4, 5, 6, 7 |
| §6.1 stale widget | 8 |
| §6.2 daily check-in | 9, 10, 11 |
| §6.3 email subscriptions | 12 |
| §6.3 Resend wrapper | 13 |
| §6.3 templates | 14 |
| §6.3 Inngest functions + cron | 15 |
| §6.3 audit-complete trigger | 16 |
| §6.3 Clerk webhook | 17 |
| §6.4 settings | 18 |
| §7 nav integration | 19 |
| §11 rollout / verification | 20 |

Coverage clean.

**Placeholder scan:** No "TBD" / "implement later" / "add error handling" remains. Task 7 says the resume page wiring depends on the existing job object shape — that's a known accommodation, not a placeholder, and the import + button are concrete.

**Type consistency:** `EmailKind`, `ApplicationStatus`, `getStreak`, `recordCheckin`, `sendEmail` typed consistently across tasks. The `inngestFunctions` array and `serve()` pattern are documented in two acceptable shapes in Task 15 — the implementer picks whichever compiles.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-10-phase-2b-tracker-checkin-email.md`.**
