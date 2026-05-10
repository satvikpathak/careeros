# Phase 2A — Async Audit, Onboarding, History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the synchronous resume audit with an Inngest-backed async job, gate first-time users behind a 3-step onboarding wizard, and add an audit-history page that drives a real readiness trend on the dashboard.

**Architecture:** A new `audit_jobs` table tracks per-job status. `/api/audit/start` enqueues a job and returns instantly; an Inngest function runs the heavy work (PDF parse → Gemini → embed → DB) and writes the existing `careerAudits` row. A polling `<AuditProgress>` component streams stage updates to the wizard, the resume page, and a dashboard banner. `/dashboard/history` renders the existing `careerAudits` rows; the dashboard's chart now reads from the same source instead of hard-coded data.

**Tech Stack:** Next.js 16 (App Router) · Inngest · Drizzle/Neon Postgres · Clerk · Vitest. Adds `inngest` (one new dep).

**Hard constraints:**
- `src/app/page.tsx` — UNTOUCHED.
- `src/components/SplineScene.tsx`, `src/components/CloudBackground.tsx` — UNTOUCHED.
- All new UI lives under `/dashboard/**` and uses tokens / primitives from Phase 1.

**Branch:** `phase-2a-async-audit-onboarding`, stacked on `phase-1-stabilize-restyle`.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/lib/jobs/inngest.ts` | Inngest client + `auditRun` function |
| `src/lib/audit/runner.ts` | `runAuditJob(jobId)` — pure pipeline, no HTTP |
| `src/lib/audit/dev-runner.ts` | In-process fallback when Inngest creds missing |
| `src/lib/audit/trend.ts` | `getAuditTrend(userId)` — readiness/market series |
| `src/lib/audit/require-onboarded.ts` | Redirect predicate |
| `src/app/api/inngest/route.ts` | Inngest webhook endpoint |
| `src/app/api/audit/start/route.ts` | POST: upload PDF, create job, enqueue |
| `src/app/api/audit/[jobId]/route.ts` | GET: job status (auth-gated) |
| `src/app/api/audit/[jobId]/retry/route.ts` | POST: re-fire failed job |
| `src/app/api/audit/latest-job/route.ts` | GET: most-recent job for user |
| `src/components/audit/AuditProgress.tsx` | Polling progress UI |
| `src/components/audit/HistoryDrawer.tsx` | Per-audit detail dialog |
| `src/app/dashboard/onboarding/page.tsx` | 3-step wizard (client) |
| `src/app/dashboard/history/page.tsx` | RSC + chart + table |
| `drizzle/0000_phase2a.sql` | Schema migration (auto-generated) |

### Modified files

| Path | Why |
|---|---|
| `package.json` | add `inngest` dep |
| `src/db/schema.ts` | add `auditJobs` table + `users.onboardedAt` |
| `src/app/dashboard/layout.tsx` | wire `requireOnboarded` |
| `src/app/dashboard/page.tsx` | replace hard-coded `marketTrends`, mount `<AuditProgress>` banner when active job |
| `src/app/dashboard/resume/page.tsx` | call `/api/audit/start`, render progress |
| `src/app/api/resume/route.ts` | deprecate, internally forward to new flow |
| `src/app/api/dashboard/data/route.ts` | include `audit_trend` in response |

---

## Task Index

1. Install Inngest + register dev script
2. Schema migration (audit_jobs + users.onboardedAt)
3. Inngest client + audit/run function
4. Inngest webhook route
5. Audit runner module (extract pipeline)
6. `/api/audit/start` route
7. `/api/audit/[jobId]` status route
8. `/api/audit/[jobId]/retry` route
9. `/api/audit/latest-job` route
10. `<AuditProgress>` component
11. `requireOnboarded` helper + layout integration
12. Onboarding wizard page
13. Audit trend helper + dashboard integration
14. `/dashboard/history` page + drawer
15. Update `/dashboard/resume` page to use new flow
16. Deprecate `/api/resume` route (forward to new flow)
17. Add `<AuditProgress>` banner to `/dashboard`
18. Final verification

---

### Task 1: Install Inngest

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `package.json` (add dev script)

- [ ] **Step 1: Install Inngest**

Run: `npm install inngest`

- [ ] **Step 2: Add dev script**

In `package.json` `scripts` block, add:

```json
"inngest:dev": "npx inngest-cli@latest dev"
```

- [ ] **Step 3: Smoke-check the install**

Run: `node -e "require('inngest')"` — should exit 0.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add Inngest for async audit jobs"
```

---

### Task 2: Schema migration

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0000_phase2a.sql` (auto-generated)
- Create: `tests/schema-phase2a.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/schema-phase2a.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { auditJobs, users } from "@/db/schema";

describe("phase 2A schema", () => {
  it("auditJobs table exists with required columns", () => {
    const cols = Object.keys(auditJobs);
    for (const c of ["id", "userId", "status", "progress", "s3Url", "fileName", "targetRole", "githubUrl", "error", "auditId", "createdAt", "startedAt", "finishedAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("users has onboardedAt column", () => {
    expect(Object.keys(users)).toContain("onboardedAt");
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- schema-phase2a`
Expected: FAIL — `auditJobs` not exported.

- [ ] **Step 3: Update schema**

In `src/db/schema.ts`, append:

```ts
export const auditJobs = pgTable("audit_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("queued"),
  progress: jsonb("progress").default({}),
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

In the existing `users` definition, add:

```ts
onboardedAt: timestamp("onboarded_at"),
```

- [ ] **Step 4: Run test**

Run: `npm test -- schema-phase2a`
Expected: PASS.

- [ ] **Step 5: Generate migration**

Run: `npx drizzle-kit generate`
Expected: a new SQL file under `drizzle/` (named by drizzle-kit) is produced. Inspect it; it should contain a `CREATE TABLE audit_jobs` and an `ALTER TABLE users ADD COLUMN onboarded_at`.

- [ ] **Step 6: Commit (does not push migration to DB)**

```bash
git add src/db/schema.ts drizzle/ tests/schema-phase2a.test.ts
git commit -m "feat(db): add audit_jobs table and users.onboarded_at"
```

**Note:** the migration is NOT applied to the live DB in this task. Apply via `npx drizzle-kit push` against the dev Neon URL once you're ready to test end-to-end. The plan doesn't run drizzle-kit push because that requires DATABASE_URL.

---

### Task 3: Inngest client + audit/run function

**Files:**
- Create: `src/lib/jobs/inngest.ts`
- Create: `tests/inngest-client.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/inngest-client.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { inngest, auditRun } from "@/lib/jobs/inngest";

describe("inngest", () => {
  it("exports a client with id 'careeros'", () => {
    expect(inngest).toBeDefined();
    expect(inngest.id).toBe("careeros");
  });

  it("exposes auditRun function", () => {
    expect(auditRun).toBeDefined();
    expect(typeof auditRun.fn).toBe("function");
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- inngest-client`
Expected: module not found.

- [ ] **Step 3: Implement client**

Create `src/lib/jobs/inngest.ts`:

```ts
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "careeros" });

export const auditRun = inngest.createFunction(
  { id: "audit-run", retries: 1 },
  { event: "audit/run" },
  async ({ event, step }) => {
    const { runAuditJob } = await import("@/lib/audit/runner");
    await step.run("execute", () => runAuditJob(event.data.jobId as number));
  }
);

export const inngestFunctions = [auditRun];
```

- [ ] **Step 4: Verify pass**

Run: `npm test -- inngest-client`
Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/jobs/inngest.ts tests/inngest-client.test.ts
git commit -m "feat(jobs): add Inngest client + audit-run function"
```

---

### Task 4: Inngest webhook route

**Files:**
- Create: `src/app/api/inngest/route.ts`

- [ ] **Step 1: Implement**

Create `src/app/api/inngest/route.ts`:

```ts
import { serve } from "inngest/next";
import { inngest, inngestFunctions } from "@/lib/jobs/inngest";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export const { GET, POST, PUT } = serve({ client: inngest, functions: inngestFunctions });
```

- [ ] **Step 2: TS check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/inngest/route.ts
git commit -m "feat(api): add Inngest webhook endpoint"
```

---

### Task 5: Audit runner module (extract pipeline)

**Files:**
- Create: `src/lib/audit/runner.ts`
- Create: `src/lib/audit/dev-runner.ts`
- Create: `tests/audit-runner.test.ts`

This task extracts the audit pipeline currently inline in `src/app/api/resume/route.ts` into a pure function that operates on a pre-uploaded S3 PDF. The original route is left alone in this task — Tasks 6 and 16 wire it up.

- [ ] **Step 1: Write the failing test**

Create `tests/audit-runner.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: { auditJobs: { findFirst: vi.fn() } },
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([{ id: 99 }])) })) })),
  },
}));

vi.mock("@/lib/gemini", () => ({
  parseResumeWithGemini: vi.fn(() => Promise.resolve(JSON.stringify({
    inferred_current_role: "Software Engineer",
    inferred_profession_domain: "Software",
    target_role_used: "Senior Engineer",
    readiness_score: 80,
    market_match_score: 75,
    project_quality_score: 70,
    skill_map: { typescript: 90 },
    skill_gaps: ["k8s"],
  }))),
  parseResumeStructured: vi.fn(() => Promise.resolve("{}")),
  generateEmbedding: vi.fn(() => Promise.resolve([0.1, 0.2, 0.3])),
}));

vi.mock("pdf-parse-fork", () => ({
  default: vi.fn(() => Promise.resolve({ text: "RESUME CONTENT" })),
}));

vi.mock("node:fs/promises", () => ({
  default: { readFile: vi.fn(() => Promise.resolve(Buffer.from("pdf bytes"))) },
}));

import { runAuditJob } from "@/lib/audit/runner";
import { db } from "@/db";

describe("runAuditJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.query.auditJobs.findFirst as any).mockResolvedValue({
      id: 1,
      userId: 7,
      status: "queued",
      s3Url: "local:///tmp/test.pdf",
      fileName: "test.pdf",
      targetRole: "Senior Engineer",
      githubUrl: null,
    });
  });

  it("transitions queued → running → done and writes audit", async () => {
    await runAuditJob(1);
    const updateCalls = (db.update as any).mock.calls.length;
    expect(updateCalls).toBeGreaterThanOrEqual(2); // running, then done
    expect((db.insert as any)).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- audit-runner`
Expected: module not found.

- [ ] **Step 3: Implement runner**

Create `src/lib/audit/runner.ts`:

```ts
import { db } from "@/db";
import { auditJobs, careerAudits, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseResumeWithGemini, parseResumeStructured, generateEmbedding } from "@/lib/gemini";

type Stage = "parsing" | "ai" | "embed" | "saving";

async function setStage(jobId: number, stage: Stage, pct: number) {
  await db.update(auditJobs)
    .set({ progress: { stage, pct } })
    .where(eq(auditJobs.id, jobId));
}

async function readPdf(s3Url: string): Promise<Buffer> {
  if (s3Url.startsWith("local://")) {
    const path = s3Url.replace("local://", "");
    const fs = (await import("node:fs/promises")).default;
    return fs.readFile(path);
  }
  // S3 URL: presigned or public — fetch
  const res = await fetch(s3Url);
  if (!res.ok) throw new Error(`S3 fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function runAuditJob(jobId: number): Promise<void> {
  const job = await db.query.auditJobs.findFirst({ where: eq(auditJobs.id, jobId) });
  if (!job) throw new Error(`audit_jobs#${jobId} not found`);

  await db.update(auditJobs)
    .set({ status: "running", startedAt: new Date(), progress: { stage: "parsing", pct: 5 } })
    .where(eq(auditJobs.id, jobId));

  try {
    const buf = await readPdf(job.s3Url!);
    const pdf = (await import("pdf-parse-fork")).default;
    const pdfData = await pdf(buf);
    const resumeText = pdfData.text || "";

    await setStage(jobId, "ai", 30);

    const [auditRaw, parsedRaw] = await Promise.all([
      parseResumeWithGemini(`RESUME:\n${resumeText}`, job.targetRole || ""),
      parseResumeStructured(resumeText, job.targetRole || ""),
    ]);

    let audit: any;
    try {
      const m = auditRaw.match(/```json\s*([\s\S]*?)\s*```/);
      audit = JSON.parse(m ? m[1] : auditRaw);
    } catch {
      audit = { skill_map: {}, skill_gaps: [] };
    }

    await setStage(jobId, "embed", 70);

    let embedding: number[] = [];
    try {
      const summary = `${Object.keys(audit.skill_map || {}).join(", ")} ${(audit.skill_gaps || []).join(", ")} ${job.targetRole || ""}`;
      embedding = await generateEmbedding(summary);
    } catch { /* embedding is best-effort */ }

    await setStage(jobId, "saving", 90);

    const [savedAudit] = await db.insert(careerAudits).values({
      userId: job.userId,
      readinessScore: Number(audit.readiness_score) || 0,
      marketMatchScore: Number(audit.market_match_score) || 0,
      projectQualityScore: Number(audit.project_quality_score) || 0,
      skillMap: audit.skill_map || {},
      atsKeywordAnalysis: {
        recommendations: audit.ats_recommendations || [],
        skill_gaps: audit.skill_gaps || [],
        depth_vs_breadth: audit.depth_vs_breadth || "",
        market_alignment: audit.market_alignment_insights || "",
        inferred_current_role: audit.inferred_current_role || "",
        inferred_profession_domain: audit.inferred_profession_domain || "",
        target_role_used: audit.target_role_used || job.targetRole || "",
      },
    }).returning();

    await db.update(users)
      .set({ lastAuditAt: new Date() })
      .where(eq(users.id, job.userId));

    await db.update(auditJobs)
      .set({
        status: "done",
        finishedAt: new Date(),
        auditId: savedAudit.id,
        progress: { stage: "saving", pct: 100 },
      })
      .where(eq(auditJobs.id, jobId));
  } catch (err) {
    await db.update(auditJobs)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: err instanceof Error ? err.message : String(err),
      })
      .where(eq(auditJobs.id, jobId));
    throw err;
  }
}
```

- [ ] **Step 4: Implement dev runner**

Create `src/lib/audit/dev-runner.ts`:

```ts
import { runAuditJob } from "./runner";

/**
 * In-process job execution for local dev when Inngest credentials are missing.
 * Returns immediately; the actual audit runs in the background.
 */
export function fireAndForget(jobId: number): void {
  runAuditJob(jobId).catch((err) => {
    console.error(`dev-runner: audit ${jobId} failed`, err);
  });
}

export function isInngestConfigured(): boolean {
  return Boolean(process.env.INNGEST_EVENT_KEY);
}
```

- [ ] **Step 5: Verify test passes**

Run: `npm test -- audit-runner`
Expected: 1 passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/audit tests/audit-runner.test.ts
git commit -m "feat(audit): extract async runner with dev fallback"
```

---

### Task 6: `/api/audit/start` route

**Files:**
- Create: `src/app/api/audit/start/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetRole = String(formData.get("targetRole") || "").trim();
    const githubUrl = String(formData.get("githubUrl") || "").trim();

    if (!file) return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    if (file.type !== "application/pdf") return NextResponse.json({ success: false, error: "Only PDF accepted" }, { status: 400 });

    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();
    const user = await currentUser();
    if (!clerkId || !user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { syncUserWithNeon } = await import("@/lib/user-sync");
    const dbUser = await syncUserWithNeon(clerkId, user.emailAddresses[0].emailAddress, `${user.firstName || ""} ${user.lastName || ""}`.trim());

    // Upload to S3 (best-effort)
    const bytes = Buffer.from(await file.arrayBuffer());
    let s3Url = `local:///tmp/${file.name}`;
    try {
      const { uploadToS3 } = await import("@/lib/s3");
      s3Url = await uploadToS3(bytes, file.name, file.type);
    } catch (s3err) {
      // Local fallback: write to /tmp so the runner can still read it
      const fs = (await import("node:fs/promises")).default;
      const path = (await import("node:path")).default;
      const os = (await import("node:os")).default;
      const tmpPath = path.join(os.tmpdir(), `${Date.now()}-${file.name}`);
      await fs.writeFile(tmpPath, bytes);
      s3Url = `local://${tmpPath}`;
    }

    const { db } = await import("@/db");
    const { auditJobs } = await import("@/db/schema");

    const [job] = await db.insert(auditJobs).values({
      userId: dbUser.id,
      status: "queued",
      s3Url,
      fileName: file.name,
      targetRole,
      githubUrl: githubUrl || null,
    }).returning();

    const { isInngestConfigured, fireAndForget } = await import("@/lib/audit/dev-runner");
    if (isInngestConfigured()) {
      const { inngest } = await import("@/lib/jobs/inngest");
      await inngest.send({ name: "audit/run", data: { jobId: job.id } });
    } else {
      fireAndForget(job.id);
    }

    return NextResponse.json({ success: true, data: { jobId: job.id } });
  } catch (err) {
    console.error("audit/start error:", err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add src/app/api/audit/start/route.ts
git commit -m "feat(api): POST /api/audit/start enqueues async audit job"
```

---

### Task 7: `/api/audit/[jobId]` status route

**Files:**
- Create: `src/app/api/audit/[jobId]/route.ts`
- Create: `tests/audit-status-route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/audit-status-route.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: { auditJobs: { findFirst: vi.fn() }, users: { findFirst: vi.fn() } },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "clerk-123" })),
}));

import { GET } from "@/app/api/audit/[jobId]/route";
import { db } from "@/db";

describe("GET /api/audit/[jobId]", () => {
  it("returns 404 when job missing", async () => {
    (db.query.auditJobs.findFirst as any).mockResolvedValue(null);
    const req = new Request("http://localhost/api/audit/42");
    const res = await GET(req as any, { params: Promise.resolve({ jobId: "42" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when job belongs to a different user", async () => {
    (db.query.users.findFirst as any).mockResolvedValue({ id: 1, clerkId: "clerk-123" });
    (db.query.auditJobs.findFirst as any).mockResolvedValue({ id: 42, userId: 999, status: "queued" });
    const req = new Request("http://localhost/api/audit/42");
    const res = await GET(req as any, { params: Promise.resolve({ jobId: "42" }) });
    expect(res.status).toBe(403);
  });

  it("returns 200 + status payload for owner", async () => {
    (db.query.users.findFirst as any).mockResolvedValue({ id: 1, clerkId: "clerk-123" });
    (db.query.auditJobs.findFirst as any).mockResolvedValue({ id: 42, userId: 1, status: "running", progress: { stage: "ai", pct: 50 }, auditId: null, error: null });
    const req = new Request("http://localhost/api/audit/42");
    const res = await GET(req as any, { params: Promise.resolve({ jobId: "42" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("running");
    expect(json.data.progress.pct).toBe(50);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- audit-status-route`
Expected: module not found.

- [ ] **Step 3: Implement**

```ts
// src/app/api/audit/[jobId]/route.ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId: jobIdStr } = await ctx.params;
  const jobId = Number(jobIdStr);
  if (!Number.isFinite(jobId)) return NextResponse.json({ success: false, error: "Invalid job id" }, { status: 400 });

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { auditJobs, users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const job = await db.query.auditJobs.findFirst({ where: eq(auditJobs.id, jobId) });
  if (!job) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  if (job.userId !== dbUser.id) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    success: true,
    data: {
      id: job.id,
      status: job.status,
      progress: job.progress || {},
      auditId: job.auditId,
      error: job.error,
    },
  });
}
```

- [ ] **Step 4: Verify pass + commit**

```bash
npm test -- audit-status-route
git add src/app/api/audit/[jobId]/route.ts tests/audit-status-route.test.ts
git commit -m "feat(api): GET /api/audit/[jobId] status with auth gate"
```

---

### Task 8: `/api/audit/[jobId]/retry` route

**Files:**
- Create: `src/app/api/audit/[jobId]/retry/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId: jobIdStr } = await ctx.params;
  const jobId = Number(jobIdStr);
  if (!Number.isFinite(jobId)) return NextResponse.json({ success: false, error: "Invalid job id" }, { status: 400 });

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { auditJobs, users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const job = await db.query.auditJobs.findFirst({ where: eq(auditJobs.id, jobId) });
  if (!job) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  if (job.userId !== dbUser.id) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  if (job.status !== "failed") return NextResponse.json({ success: false, error: "Only failed jobs can be retried" }, { status: 400 });

  await db.update(auditJobs)
    .set({ status: "queued", error: null, progress: {}, startedAt: null, finishedAt: null })
    .where(eq(auditJobs.id, jobId));

  const { isInngestConfigured, fireAndForget } = await import("@/lib/audit/dev-runner");
  if (isInngestConfigured()) {
    const { inngest } = await import("@/lib/jobs/inngest");
    await inngest.send({ name: "audit/run", data: { jobId } });
  } else {
    fireAndForget(jobId);
  }

  return NextResponse.json({ success: true, data: { jobId } });
}
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add src/app/api/audit/[jobId]/retry/route.ts
git commit -m "feat(api): POST /api/audit/[jobId]/retry"
```

---

### Task 9: `/api/audit/latest-job` route

**Files:**
- Create: `src/app/api/audit/latest-job/route.ts`

- [ ] **Step 1: Implement**

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
  const { auditJobs, users } = await import("@/db/schema");
  const { eq, desc } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: true, data: null });

  const job = await db.query.auditJobs.findFirst({
    where: eq(auditJobs.userId, dbUser.id),
    orderBy: [desc(auditJobs.createdAt)],
  });

  return NextResponse.json({ success: true, data: job ?? null });
}
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add src/app/api/audit/latest-job/route.ts
git commit -m "feat(api): GET /api/audit/latest-job"
```

---

### Task 10: `<AuditProgress>` component

**Files:**
- Create: `src/components/audit/AuditProgress.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Stage = "parsing" | "ai" | "embed" | "saving";
type JobStatus = "queued" | "running" | "done" | "failed";

interface AuditProgressProps {
  jobId: number;
  onComplete?: (auditId: number) => void;
  onError?: (err: string) => void;
  className?: string;
}

const STAGES: { key: Stage; label: string }[] = [
  { key: "parsing", label: "Parsing resume" },
  { key: "ai", label: "AI analysis" },
  { key: "embed", label: "Generating embedding" },
  { key: "saving", label: "Saving audit" },
];

const POLL_BASE_MS = 1500;
const POLL_MAX_MS = 6000;
const TIMEOUT_MS = 5 * 60 * 1000;

export function AuditProgress({ jobId, onComplete, onError, className }: AuditProgressProps) {
  const [status, setStatus] = React.useState<JobStatus>("queued");
  const [progress, setProgress] = React.useState<{ stage?: Stage; pct?: number }>({});
  const [error, setError] = React.useState<string | null>(null);
  const [retrying, setRetrying] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const startedAt = Date.now();

    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/audit/${jobId}`, { cache: "no-store" });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Status check failed");
        attempt = 0;
        setStatus(json.data.status);
        setProgress(json.data.progress || {});
        setError(json.data.error);
        if (json.data.status === "done") {
          onComplete?.(json.data.auditId);
          return;
        }
        if (json.data.status === "failed") {
          onError?.(json.data.error || "Audit failed");
          return;
        }
      } catch (err) {
        attempt = Math.min(attempt + 1, 3);
      }
      if (Date.now() - startedAt > TIMEOUT_MS) {
        setError("Audit took too long. Try refreshing.");
        return;
      }
      const delay = Math.min(POLL_BASE_MS * Math.pow(2, attempt), POLL_MAX_MS);
      setTimeout(tick, delay);
    };
    tick();
    return () => { cancelled = true; };
  }, [jobId, onComplete, onError]);

  const retry = async () => {
    setRetrying(true);
    try {
      await fetch(`/api/audit/${jobId}/retry`, { method: "POST" });
      setStatus("queued");
      setError(null);
      setProgress({});
    } finally {
      setRetrying(false);
    }
  };

  const currentIdx = STAGES.findIndex((s) => s.key === progress.stage);
  const overallPct = progress.pct ?? (status === "queued" ? 2 : 0);

  return (
    <div className={cn("rounded-xl border border-neutral-200 bg-white p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === "failed" ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : status === "done" ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-neutral-700" />
          )}
          <p className="text-sm font-semibold text-neutral-950">
            {status === "failed" ? "Audit failed" : status === "done" ? "Audit complete" : "Generating your audit"}
          </p>
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{overallPct}%</span>
      </div>

      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <motion.div
          className={cn("h-full rounded-full", status === "failed" ? "bg-red-500" : "bg-neutral-950")}
          initial={{ width: 0 }}
          animate={{ width: `${overallPct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <ul className="space-y-2">
        {STAGES.map((s, i) => {
          const done = currentIdx > i || status === "done";
          const active = currentIdx === i && status === "running";
          return (
            <li key={s.key} className="flex items-center gap-2 text-sm">
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              ) : active ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-700" />
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border border-neutral-300" />
              )}
              <span className={cn(done ? "text-neutral-500" : active ? "text-neutral-950 font-medium" : "text-neutral-400")}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ul>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
          {status === "failed" && (
            <Button onClick={retry} disabled={retrying} size="sm" variant="outline" className="ml-2">
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add src/components/audit/AuditProgress.tsx
git commit -m "feat(audit): AuditProgress polling component"
```

---

### Task 11: `requireOnboarded` helper + layout integration

**Files:**
- Create: `src/lib/audit/require-onboarded.ts`
- Modify: `src/app/dashboard/layout.tsx`
- Create: `tests/onboarding-redirect.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/onboarding-redirect.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { shouldRedirectToOnboarding } from "@/lib/audit/require-onboarded";

describe("shouldRedirectToOnboarding", () => {
  it("redirects when not onboarded and not already on wizard", () => {
    expect(shouldRedirectToOnboarding({ onboardedAt: null }, "/dashboard")).toBe(true);
  });
  it("does not redirect when on the wizard route", () => {
    expect(shouldRedirectToOnboarding({ onboardedAt: null }, "/dashboard/onboarding")).toBe(false);
  });
  it("does not redirect when already onboarded", () => {
    expect(shouldRedirectToOnboarding({ onboardedAt: new Date() }, "/dashboard")).toBe(false);
  });
  it("does not redirect on auth pages", () => {
    expect(shouldRedirectToOnboarding({ onboardedAt: null }, "/sign-in")).toBe(false);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- onboarding-redirect`
Expected: module not found.

- [ ] **Step 3: Implement helper**

```ts
// src/lib/audit/require-onboarded.ts

export function shouldRedirectToOnboarding(
  user: { onboardedAt: Date | null | undefined },
  pathname: string
): boolean {
  if (user.onboardedAt) return false;
  if (!pathname.startsWith("/dashboard")) return false;
  if (pathname.startsWith("/dashboard/onboarding")) return false;
  return true;
}
```

- [ ] **Step 4: Verify pass**

Run: `npm test -- onboarding-redirect`
Expected: 4 pass.

- [ ] **Step 5: Wire into layout**

In `src/app/dashboard/layout.tsx`, the layout is currently a client component. Convert to a thin server wrapper that fetches user state, then renders the existing client component as a child.

Replace ENTIRE file content with:

```tsx
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { shouldRedirectToOnboarding } from "@/lib/audit/require-onboarded";
import { headers } from "next/headers";
import DashboardClientLayout from "./client-layout";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") || "/dashboard";
  if (dbUser && shouldRedirectToOnboarding(dbUser, pathname)) {
    redirect("/dashboard/onboarding");
  }

  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
```

Move the existing client logic to `src/app/dashboard/client-layout.tsx` (rename / new file with the existing JSX from before, dropping the `auth` hook since the parent server layout handles it):

```tsx
"use client";

import { useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import AppNavbar from "@/components/navigation/AppNavbar";
import { useRoadmapStore } from "@/stores/roadmap-store";
import { UsageChip } from "@/components/ui/usage-chip";

export default function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userId } = useAuth();
  const bindToUser = useRoadmapStore((s) => s.bindToUser);

  useEffect(() => {
    bindToUser(userId ?? null);
  }, [userId, bindToUser]);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/resume", label: "Resume" },
    { href: "/dashboard/history", label: "History" },
    { href: "/dashboard/roadmap", label: "Roadmap" },
    { href: "/dashboard/jobs", label: "Jobs" },
    { href: "/dashboard/resources", label: "Resources" },
    { href: "/dashboard/chat", label: "AI Interview" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppNavbar
        links={navLinks}
        rightSlot={(
          <div className="flex items-center gap-3">
            <UsageChip />
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: { userButtonAvatarBox: "w-9 h-9 border border-neutral-200" },
              }}
            />
          </div>
        )}
      />

      <main className="mx-auto flex-1 w-full max-w-7xl px-4 pb-8 pt-32 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
```

**Note on the `pathname` retrieval:** Next.js doesn't expose `pathname` to server components directly. The simpler pattern: do the redirect in a small server component nested inside, or use middleware. To keep things contained, add a small Next.js middleware:

Create `src/middleware.ts`:

```ts
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(async (_auth, req) => {
  const res = NextResponse.next();
  res.headers.set("x-pathname", req.nextUrl.pathname);
  return res;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

If a `middleware.ts` already exists at `src/middleware.ts`, merge — add the `x-pathname` line. Don't create a duplicate file.

- [ ] **Step 6: TS check + commit**

```bash
npx tsc --noEmit
git add src/lib/audit/require-onboarded.ts src/app/dashboard/layout.tsx src/app/dashboard/client-layout.tsx src/middleware.ts tests/onboarding-redirect.test.ts
git commit -m "feat(onboarding): requireOnboarded helper + redirect from dashboard layout"
```

---

### Task 12: Onboarding wizard page

**Files:**
- Create: `src/app/dashboard/onboarding/page.tsx`
- Create: `src/app/api/onboarding/complete/route.ts`

- [ ] **Step 1: Implement complete route**

```ts
// src/app/api/onboarding/complete/route.ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST() {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  await db.update(users)
    .set({ onboardedAt: new Date() })
    .where(eq(users.clerkId, clerkId));

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Implement wizard page**

```tsx
// src/app/dashboard/onboarding/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { AuditProgress } from "@/components/audit/AuditProgress";

const ROLE_SUGGESTIONS = [
  "Software Engineer",
  "Data Analyst",
  "Product Manager",
  "Designer",
  "Marketing Manager",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [file, setFile] = React.useState<File | null>(null);
  const [targetRole, setTargetRole] = React.useState("");
  const [jobId, setJobId] = React.useState<number | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [completing, setCompleting] = React.useState(false);

  const submit = async () => {
    if (!file) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("targetRole", targetRole);
      const res = await fetch("/api/audit/start", { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) setJobId(json.data.jobId);
    } finally {
      setSubmitting(false);
    }
  };

  const finish = async () => {
    setCompleting(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
      router.push("/dashboard");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SectionHeader
        eyebrow={`Step ${step} of 3`}
        title="Welcome to CareerOS"
        description="Three quick steps and we'll have your career intelligence audit ready."
      />

      <div className="flex gap-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full ${n <= step ? "bg-neutral-950" : "bg-neutral-200"}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-950">Upload your resume</h3>
              <p className="mt-1 text-sm text-neutral-500">PDF only. We'll start parsing as soon as you select it.</p>

              <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center transition hover:bg-neutral-100">
                <Upload className="h-6 w-6 text-neutral-400" />
                <span className="mt-3 text-sm font-medium text-neutral-700">
                  {file ? file.name : "Drop or click to choose a PDF"}
                </span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>

              <div className="mt-6 flex justify-end">
                <Button disabled={!file} onClick={() => setStep(2)}>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-950">Target role</h3>
              <p className="mt-1 text-sm text-neutral-500">Optional — helps tailor the audit. Pick a suggestion or type your own.</p>

              <Input
                className="mt-6"
                placeholder="e.g. Senior Software Engineer"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {ROLE_SUGGESTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTargetRole(r)}
                    className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={async () => {
                    await submit();
                    setStep(3);
                  }}
                  disabled={submitting}
                >
                  {submitting ? "Starting..." : "Start audit"} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-neutral-950">Generating your audit</h3>
              <p className="mt-1 text-sm text-neutral-500">You can close this page — it'll finish in the background. Or wait and we'll take you straight to the dashboard.</p>

              {jobId && (
                <div className="mt-6">
                  <AuditProgress
                    jobId={jobId}
                    onComplete={finish}
                    onError={() => { /* progress component shows the retry */ }}
                  />
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button onClick={finish} disabled={completing}>
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Go to dashboard
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: TS check + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/onboarding src/app/api/onboarding
git commit -m "feat(onboarding): 3-step wizard with async audit kickoff"
```

---

### Task 13: Audit trend helper + dashboard chart integration

**Files:**
- Create: `src/lib/audit/trend.ts`
- Create: `tests/audit-trend.test.ts`
- Modify: `src/app/api/dashboard/data/route.ts`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Write the failing test**

```ts
// tests/audit-trend.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/db", () => ({
  db: {
    query: { careerAudits: { findMany: vi.fn() } },
  },
}));

import { getAuditTrend } from "@/lib/audit/trend";
import { db } from "@/db";

describe("getAuditTrend", () => {
  it("returns chronologically-ordered series", async () => {
    (db.query.careerAudits.findMany as any).mockResolvedValue([
      { createdAt: new Date("2026-03-01"), readinessScore: 70, marketMatchScore: 65 },
      { createdAt: new Date("2026-04-01"), readinessScore: 78, marketMatchScore: 72 },
      { createdAt: new Date("2026-05-01"), readinessScore: 84, marketMatchScore: 80 },
    ]);
    const series = await getAuditTrend(1);
    expect(series.length).toBe(3);
    expect(series[0].readiness).toBe(70);
    expect(series[2].readiness).toBe(84);
    expect(series[0].date < series[2].date).toBe(true);
  });

  it("returns [] when no audits", async () => {
    (db.query.careerAudits.findMany as any).mockResolvedValue([]);
    const series = await getAuditTrend(1);
    expect(series).toEqual([]);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- audit-trend`
Expected: module not found.

- [ ] **Step 3: Implement helper**

```ts
// src/lib/audit/trend.ts
import { db } from "@/db";
import { careerAudits } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export interface AuditTrendPoint {
  date: string; // ISO date
  readiness: number;
  marketMatch: number;
}

export async function getAuditTrend(userId: number): Promise<AuditTrendPoint[]> {
  const rows = await db.query.careerAudits.findMany({
    where: eq(careerAudits.userId, userId),
    orderBy: [asc(careerAudits.createdAt)],
    limit: 24,
  });
  return rows.map((r) => ({
    date: (r.createdAt ?? new Date()).toISOString(),
    readiness: r.readinessScore ?? 0,
    marketMatch: r.marketMatchScore ?? 0,
  }));
}
```

- [ ] **Step 4: Verify pass**

Run: `npm test -- audit-trend`
Expected: 2 pass.

- [ ] **Step 5: Wire into dashboard data API**

In `src/app/api/dashboard/data/route.ts`, after `const progress = await db.query.skillProgress.findMany(...)`, add:

```ts
const { getAuditTrend } = await import("@/lib/audit/trend");
const auditTrend = await getAuditTrend(dbUser.id);
```

In the success response `data` object, add `auditTrend,` alongside `audit`, `sprint`, etc.

In the catch block's empty-data fallback, add `auditTrend: [],`.

- [ ] **Step 6: Replace `marketTrends` in dashboard**

In `src/app/dashboard/page.tsx`:

Find the line:
```ts
  const marketTrends = [
    { month: "Jan", revenue: 42, ...
```

Delete the entire `marketTrends` array. Replace with:

```ts
  const auditTrend = data?.auditTrend || [];
  const trendChartData = auditTrend.length > 0
    ? auditTrend.map((p: any) => ({
        month: new Date(p.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
        readiness: p.readiness,
        market: p.marketMatch,
      }))
    : [
        { month: "—", readiness: 0, market: 0 },
      ];
```

In the `<AreaChart>` block, replace `data={marketTrends}` with `data={trendChartData}`. Remove the `conversion`/`sessions` series — keep only `readiness` (was `revenue`) and `market` (was `conversion`). Update the `<Area dataKey>` props accordingly: rename `revenue` → `readiness`, drop the `sessions` Area entirely, rename `conversion` → `market`.

The legend block also has hard-coded labels — update to:
```tsx
{ label: "Readiness", color: "#0A0A0A" },
{ label: "Market Fit", color: "#737373" },
```

- [ ] **Step 7: TS check + commit**

```bash
npx tsc --noEmit
git add src/lib/audit/trend.ts src/app/api/dashboard/data/route.ts src/app/dashboard/page.tsx tests/audit-trend.test.ts
git commit -m "feat(dashboard): real readiness trend from audit history"
```

---

### Task 14: `/dashboard/history` page + drawer

**Files:**
- Create: `src/app/dashboard/history/page.tsx`
- Create: `src/components/audit/HistoryDrawer.tsx`

- [ ] **Step 1: Implement HistoryDrawer (client)**

```tsx
// src/components/audit/HistoryDrawer.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface HistoryDrawerProps {
  open: boolean;
  audit: any | null;
  onOpenChange: (open: boolean) => void;
}

export function HistoryDrawer({ open, audit, onOpenChange }: HistoryDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit details</DialogTitle>
        </DialogHeader>
        {audit && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Readiness" value={`${audit.readinessScore}%`} />
              <Stat label="Market Match" value={`${audit.marketMatchScore}%`} />
              <Stat label="Project Quality" value={`${audit.projectQualityScore}%`} />
            </div>
            <pre className="max-h-96 overflow-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs">
              {JSON.stringify(audit, null, 2)}
            </pre>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-950">{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Implement history page (RSC + client wrapper)**

`/dashboard/history` is part client (drawer state) and part server. Simplest: keep the whole page client-side, fetch via `/api/dashboard/data` which already returns audits/trend.

```tsx
// src/app/dashboard/history/page.tsx
"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { HistoryDrawer } from "@/components/audit/HistoryDrawer";

export default function HistoryPage() {
  const [loading, setLoading] = React.useState(true);
  const [audits, setAudits] = React.useState<any[]>([]);
  const [trend, setTrend] = React.useState<any[]>([]);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<any | null>(null);

  React.useEffect(() => {
    fetch("/api/dashboard/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setAudits(j.data.audits);
          setTrend(j.data.trend);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <EmptyState
        title="No audits yet"
        description="Once you upload a resume your audit history will appear here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="History" title="Audit timeline" description={`${audits.length} audit${audits.length === 1 ? "" : "s"} on file`} />

      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold text-neutral-950">Readiness over time</h3>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid stroke="#F5F5F5" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })} tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="readiness" stroke="#0A0A0A" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="marketMatch" stroke="#737373" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <ul className="divide-y divide-neutral-200">
          {audits.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => { setSelected(a); setOpen(true); }}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-neutral-50"
              >
                <div>
                  <p className="text-sm font-semibold text-neutral-950">
                    {new Date(a.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {a.atsKeywordAnalysis?.target_role_used || "General Professional"}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-neutral-700"><span className="font-semibold text-neutral-950">{a.readinessScore}%</span> readiness</span>
                  <span className="text-neutral-700"><span className="font-semibold text-neutral-950">{a.marketMatchScore}%</span> market</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <HistoryDrawer open={open} audit={selected} onOpenChange={setOpen} />
    </div>
  );
}
```

- [ ] **Step 3: Add `/api/dashboard/history` endpoint**

```ts
// src/app/api/dashboard/history/route.ts
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
  const { careerAudits, users } = await import("@/db/schema");
  const { eq, desc } = await import("drizzle-orm");
  const { getAuditTrend } = await import("@/lib/audit/trend");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: true, data: { audits: [], trend: [] } });

  const audits = await db.query.careerAudits.findMany({
    where: eq(careerAudits.userId, dbUser.id),
    orderBy: [desc(careerAudits.createdAt)],
    limit: 50,
  });
  const trend = await getAuditTrend(dbUser.id);

  return NextResponse.json({ success: true, data: { audits, trend } });
}
```

- [ ] **Step 4: TS check + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/history src/components/audit/HistoryDrawer.tsx src/app/api/dashboard/history
git commit -m "feat(dashboard): audit history page + per-audit drawer"
```

---

### Task 15: Update `/dashboard/resume` page to use new flow

**Files:**
- Modify: `src/app/dashboard/resume/page.tsx`

The current page calls `POST /api/resume` and waits for the full audit response. Replace with: call `POST /api/audit/start`, mount `<AuditProgress>`, refresh data on completion.

- [ ] **Step 1: Find the existing upload submission code**

Read `src/app/dashboard/resume/page.tsx`. Locate the form submission handler that calls `/api/resume`. It posts a `FormData` with `file`, `githubUrl`, `targetRole`.

- [ ] **Step 2: Refactor**

Replace the submission handler so that after a successful POST it:
1. Saves the returned `jobId` into a local state.
2. Renders `<AuditProgress jobId={jobId} onComplete={...} onError={...} />` in the same panel that previously showed the upload state.
3. On `onComplete`, refetches the existing dashboard data hook (`fetch("/api/dashboard/data", ...)`) so the page populates with the new audit.

```tsx
// near the top, alongside other imports
import { AuditProgress } from "@/components/audit/AuditProgress";

// inside the component, near other useState calls
const [jobId, setJobId] = React.useState<number | null>(null);
```

Replace the body of the existing submit handler (after PDF validation passes) with:

```tsx
const fd = new FormData();
fd.append("file", file);
fd.append("githubUrl", githubUrl || "");
fd.append("targetRole", targetRole || "");

const res = await fetch("/api/audit/start", { method: "POST", body: fd });
const json = await res.json();
if (!json.success) {
  setError(json.error || "Audit failed to start");
  setUploading(false);
  return;
}
setJobId(json.data.jobId);
setUploading(false);
```

In the JSX, replace the panel that shows ATS score / parsed data while uploading with:

```tsx
{jobId && (
  <AuditProgress
    jobId={jobId}
    onComplete={() => {
      // Pull the freshly-saved audit
      fetch("/api/dashboard/data", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          if (j.success && j.data?.audit) {
            // existing setters: setParsedResume, setAtsScore, etc.
            // hydrate the same way the page does on initial load
            window.location.reload();
          }
        });
    }}
    onError={(err) => setError(err)}
  />
)}
```

If the existing page has a complex inline display of "audit in progress", remove it — `<AuditProgress>` replaces it. Other UI (drag-drop, role picker, previous audit panel) stays.

- [ ] **Step 3: TS check + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/resume/page.tsx
git commit -m "refactor(resume): use async audit flow with progress"
```

---

### Task 16: Deprecate `/api/resume` route (forward to new flow)

**Files:**
- Modify: `src/app/api/resume/route.ts`

The legacy route is still imported by no UI now (after Task 15) but old client caches might hit it. Make it forward to the new pipeline so it never blocks for the full Gemini run.

- [ ] **Step 1: Replace the route body**

Replace the entire `POST` body with:

```ts
export async function POST(req: NextRequest) {
  console.warn("[deprecated] POST /api/resume — clients should call /api/audit/start instead.");

  // Forward request to the new async flow.
  const url = new URL(req.url);
  url.pathname = "/api/audit/start";
  const forwarded = new Request(url, {
    method: "POST",
    headers: req.headers,
    body: req.body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  const { POST: startHandler } = await import("../audit/start/route");
  return startHandler(forwarded as NextRequest);
}
```

If duplicating the body is awkward, simpler: just `return NextResponse.redirect(new URL("/api/audit/start", req.url), 307)`. **Use the redirect** — it's simpler and 307 preserves method + body.

So replace `POST` with:

```ts
export async function POST(req: NextRequest) {
  console.warn("[deprecated] POST /api/resume — clients should call /api/audit/start instead.");
  return NextResponse.redirect(new URL("/api/audit/start", req.url), 307);
}
```

Keep the runtime/maxDuration/dynamic exports at the top — they're harmless now.

Remove the now-unused imports inside the route file (pdf-parse-fork, gemini, etc.). Run `npx tsc --noEmit` to verify.

- [ ] **Step 2: Commit**

```bash
npx tsc --noEmit
git add src/app/api/resume/route.ts
git commit -m "refactor(api): /api/resume redirects to /api/audit/start (deprecated)"
```

---

### Task 17: Add `<AuditProgress>` banner to `/dashboard`

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add banner**

Near the top of the dashboard component, add:

```tsx
const [activeJobId, setActiveJobId] = React.useState<number | null>(null);

React.useEffect(() => {
  fetch("/api/audit/latest-job", { cache: "no-store" })
    .then((r) => r.json())
    .then((j) => {
      if (j.success && j.data && (j.data.status === "queued" || j.data.status === "running")) {
        setActiveJobId(j.data.id);
      }
    });
}, []);
```

(`React` is already imported indirectly; if not, add `import * as React from "react";` at the top.)

In the return JSX, just below `<SectionHeader ...>` (the welcome header), insert:

```tsx
{activeJobId && (
  <AuditProgress
    jobId={activeJobId}
    onComplete={() => {
      setActiveJobId(null);
      fetchDashboardData();
    }}
    onError={() => setActiveJobId(null)}
  />
)}
```

Add to imports:
```tsx
import { AuditProgress } from "@/components/audit/AuditProgress";
```

- [ ] **Step 2: TS check + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/page.tsx
git commit -m "feat(dashboard): banner shows active audit progress"
```

---

### Task 18: Final verification

- [ ] **Step 1: Test suite**

```
npm test
```

Expected: all suites passing — schema-phase2a, inngest-client, audit-runner, audit-status-route, onboarding-redirect, audit-trend, plus the Phase 1 suites.

- [ ] **Step 2: TypeScript**

```
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Lint**

```
npm run lint
```

Expected: no new errors.

- [ ] **Step 4: Local smoke (with `INNGEST_EVENT_KEY` unset)**

```
npm run dev
```

In a browser:
1. Sign up as a fresh user.
2. Get redirected to `/dashboard/onboarding`.
3. Upload a resume PDF.
4. Step through to step 3; watch `<AuditProgress>` advance through 4 stages.
5. Click "Go to dashboard" → audit data appears.
6. Visit `/dashboard/history` → see one row + a single-point chart.
7. Visit `/dashboard/resume` → see the previous-audit panel.

If the audit fails locally, check the dev runner logs. Likely missing `GEMINI_API_KEY` in `.env.local`.

- [ ] **Step 5: Push**

```bash
git push -u origin phase-2a-async-audit-onboarding
```

---

## Self-review

**Spec coverage:**

| Spec section | Tasks |
|---|---|
| §4 Async audit pipeline | 3, 5, 6, 7, 8 |
| §4 Inngest webhook | 4 |
| §5 Schema | 2 |
| §6.1 Runner | 5 |
| §6.2 Status endpoint | 7 |
| §6.3 AuditProgress | 10 |
| §6.4 Onboarding wizard | 11, 12 |
| §6.5 Dashboard polling | 9, 17 |
| §6.6 Audit history | 13, 14 |
| §7 Backwards compat | 15, 16 |
| §8 Failure handling | 8 (retry endpoint), 10 (UI retry button) |
| §9 Tests | 2, 3, 5, 7, 11, 13 |
| §11 Rollout | 18 + the migration note in Task 2 |

Coverage clean.

**Placeholder scan:** All steps have actual code or commands. No "TBD" / "etc". The Task 15 note about hydration in the resume page does say "the same way the page does on initial load" — but resolves it via `window.location.reload()` which is concrete (if blunt). Acceptable for a deprecation-path file.

**Type consistency:** `runAuditJob`, `getAuditTrend`, `shouldRedirectToOnboarding`, `AuditProgress` all referenced consistently across tasks. `audit_jobs` columns referenced in Tasks 5/6/7/8/9 match Task 2's schema definition.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-10-phase-2a-async-audit-onboarding.md`.**
