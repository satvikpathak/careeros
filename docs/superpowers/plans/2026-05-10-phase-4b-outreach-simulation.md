# Phase 4B — Outreach Drafts + Career Simulation v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the last two Pro AI features — outreach-draft generator (cold email + LinkedIn DM, copy-only) and career simulation v2 (deterministic projection of readiness vs. learned skills).

**Architecture:** Two new tables, two new gated routes, one shared "Tools" hub page with two sub-routes. Outreach reuses the Phase 4A `<JdInput>`. Simulation does pure-math projection over a Gemini-estimated per-skill lift, charted with the existing Recharts setup. Both gated by new `outreach` / `simulation` quota kinds.

**Tech Stack:** Next.js 16 · Drizzle/Neon · Gemini 2.5 Flash · Recharts · Vitest. No new deps.

**Hard constraints:**
- Landing page + 3D cloud — UNTOUCHED.
- Phase 1 monochrome tokens.
- Branch: `phase-4b-outreach-simulation`, stacked on `phase-4a-rewriter-cover-gap`.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/lib/gemini-prompts/outreach.ts` | Outreach prompt template |
| `src/lib/outreach/run.ts` | `runOutreach` — Gemini + persist |
| `src/lib/gemini-prompts/simulate.ts` | Per-skill lift prompt template |
| `src/lib/simulate/project.ts` | Pure projection math |
| `src/lib/simulate/run.ts` | `runSimulation` — baseline + Gemini + project + upsert |
| `src/app/api/outreach/run/route.ts` | POST gated |
| `src/app/api/outreach/[id]/route.ts` | GET load draft |
| `src/app/api/simulate/run/route.ts` | POST gated |
| `src/app/api/simulate/latest/route.ts` | GET latest sim |
| `src/app/dashboard/tools/page.tsx` | Hub index with 2 cards |
| `src/app/dashboard/tools/outreach/page.tsx` | Outreach generator |
| `src/app/dashboard/tools/simulate/page.tsx` | Simulation page |

### Modified files

| Path | Why |
|---|---|
| `src/db/schema.ts` | add `outreachDrafts`, `simulations` |
| `src/lib/billing/plans.ts` | add `"outreach"` and `"simulation"` to `UsageKind` + `getQuota` |
| `src/app/dashboard/client-layout.tsx` | add Tools nav link |

---

## Task Index

1. Schema (2 new tables) + UsageKind extension
2. Outreach prompt + run helper
3. Outreach routes (run + by-id)
4. Outreach page UI
5. Simulation projection math (pure, TDD-heavy)
6. Simulation prompt + run helper
7. Simulation routes (run + latest)
8. Simulation page UI
9. Tools hub + nav link
10. Final verification + push

---

### Task 1: Schema + UsageKind

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/lib/billing/plans.ts`
- Create: `tests/schema-phase4b.test.ts`
- Generate: `drizzle/0004_phase4b.sql`

- [ ] **Step 1: Failing test**

Create `tests/schema-phase4b.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { outreachDrafts, simulations } from "@/db/schema";
import { getQuota } from "@/lib/billing/plans";

describe("phase 4B schema", () => {
  it("outreachDrafts has required columns", () => {
    const cols = Object.keys(outreachDrafts);
    for (const c of ["id", "userId", "jdId", "recipientName", "recipientTitle", "emailSubject", "emailBody", "dmBody", "createdAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("simulations has required columns", () => {
    const cols = Object.keys(simulations);
    for (const c of ["id", "userId", "targetSkills", "horizonMonths", "series", "suggestedSkills", "createdAt", "updatedAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("getQuota returns 0 for free outreach and simulation", () => {
    expect(getQuota("free", "outreach" as any)).toBe(0);
    expect(getQuota("free", "simulation" as any)).toBe(0);
  });

  it("getQuota returns Infinity for pro outreach and simulation", () => {
    expect(getQuota("pro", "outreach" as any)).toBe(Infinity);
    expect(getQuota("pro", "simulation" as any)).toBe(Infinity);
  });
});
```

`npm test -- schema-phase4b` — must FAIL.

- [ ] **Step 2: Update schema**

Append to `src/db/schema.ts`:

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

export const simulations = pgTable("simulations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  targetSkills: jsonb("target_skills"),
  horizonMonths: integer("horizon_months").notNull(),
  series: jsonb("series"),
  suggestedSkills: jsonb("suggested_skills"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

- [ ] **Step 3: Update UsageKind in plans**

Open `src/lib/billing/plans.ts`. Replace the `UsageKind` type definition:

```ts
export type UsageKind = "audit" | "chat" | "roadmap" | "sprint_regen" | "rewriter" | "cover_letter" | "outreach" | "simulation";
```

In `getQuota`, add cases inside the switch (BEFORE the default if present, or alongside the existing rewriter/cover_letter cases):

```ts
case "outreach":
case "simulation":
  return plan === "free" ? 0 : Infinity;
```

`npm test -- schema-phase4b` — must PASS.

- [ ] **Step 4: Generate migration**

```bash
DATABASE_URL=postgresql://placeholder:placeholder@localhost/placeholder npx drizzle-kit generate
```

Inspect: 2 CREATE TABLE.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/lib/billing/plans.ts drizzle/ tests/schema-phase4b.test.ts
git commit -m "feat(db,billing): outreach_drafts + simulations tables, new UsageKinds"
```

---

### Task 2: Outreach prompt + run helper

**Files:**
- Create: `src/lib/gemini-prompts/outreach.ts`
- Create: `src/lib/outreach/run.ts`
- Create: `tests/outreach-run.test.ts`

- [ ] **Step 1: Prompt**

Create `src/lib/gemini-prompts/outreach.ts`:

```ts
export const OUTREACH_PROMPT = `Generate ONE concise cold email and ONE LinkedIn DM for this candidate to send to a recruiter / hiring manager about the role.

Rules:
- The email is 4-6 sentences. The DM is no more than 300 characters.
- Mention 1 specific reason for the company drawn from the JD.
- Cite 1 concrete achievement from the candidate's audit.
- No emojis. At most one exclamation mark, in the close only.
- The candidate sends this themselves — write in first person.

OUTPUT EXACTLY this JSON (no markdown, no commentary):
{
  "emailSubject": "string",
  "emailBody": "string",
  "dmBody": "string"
}

JD:
`;
```

- [ ] **Step 2: Failing test**

Create `tests/outreach-run.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  parseResumeWithGemini: vi.fn(),
  findFirstAudit: vi.fn(),
  insertReturning: vi.fn(),
}));

vi.mock("@/lib/gemini", () => ({
  parseResumeWithGemini: mocks.parseResumeWithGemini,
}));

vi.mock("@/db", () => ({
  db: {
    query: { careerAudits: { findFirst: mocks.findFirstAudit } },
    insert: () => ({ values: () => ({ returning: mocks.insertReturning }) }),
  },
}));

import { runOutreach } from "@/lib/outreach/run";

describe("runOutreach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirstAudit.mockResolvedValue({
      readinessScore: 80,
      skillMap: { typescript: 90 },
      atsKeywordAnalysis: { target_role_used: "Senior SWE", inferred_current_role: "SWE" },
    });
    mocks.insertReturning.mockResolvedValue([{ id: 7, emailSubject: "S", emailBody: "B", dmBody: "D" }]);
    mocks.parseResumeWithGemini.mockResolvedValue(JSON.stringify({
      emailSubject: "Quick note about the Senior SWE role",
      emailBody: "Body",
      dmBody: "DM",
    }));
  });

  it("returns drafts on Gemini valid JSON", async () => {
    const r = await runOutreach({ userId: 1, jdId: 2, jdText: "JD body" });
    expect(r.id).toBe(7);
    expect(mocks.parseResumeWithGemini).toHaveBeenCalled();
  });

  it("throws no_audit_on_file when audit missing", async () => {
    mocks.findFirstAudit.mockResolvedValue(null);
    await expect(runOutreach({ userId: 1, jdId: 2, jdText: "JD" })).rejects.toThrow("no_audit_on_file");
  });

  it("falls back to safe template on bad JSON", async () => {
    mocks.parseResumeWithGemini.mockResolvedValue("not valid json");
    mocks.insertReturning.mockResolvedValue([{ id: 9, emailSubject: "Re: opportunity", emailBody: "Body", dmBody: "DM" }]);
    const r = await runOutreach({ userId: 1, jdId: 2, jdText: "JD" });
    expect(r.id).toBe(9);
  });
});
```

`npm test -- outreach-run` — must FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/lib/outreach/run.ts`:

```ts
import { db } from "@/db";
import { outreachDrafts, careerAudits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { parseResumeWithGemini } from "@/lib/gemini";
import { OUTREACH_PROMPT } from "@/lib/gemini-prompts/outreach";

export interface OutreachInput {
  userId: number;
  jdId: number;
  jdText: string;
  recipientName?: string;
  recipientTitle?: string;
}

export interface OutreachOutput {
  id: number;
  emailSubject: string;
  emailBody: string;
  dmBody: string;
}

interface ParsedDraft {
  emailSubject: string;
  emailBody: string;
  dmBody: string;
}

const SAFE_FALLBACK: ParsedDraft = {
  emailSubject: "Re: opportunity",
  emailBody: "Hi — I came across the role and wanted to reach out. I'd love to share why I think it's a fit. Open to a quick call this week.",
  dmBody: "Hi — saw the role and wanted to reach out. Would love to chat briefly.",
};

function safeParse(raw: string): ParsedDraft {
  try {
    const m = raw.match(/```json\s*([\s\S]*?)\s*```/);
    const json = JSON.parse(m ? m[1] : raw);
    return {
      emailSubject: String(json.emailSubject ?? SAFE_FALLBACK.emailSubject),
      emailBody: String(json.emailBody ?? SAFE_FALLBACK.emailBody),
      dmBody: String(json.dmBody ?? SAFE_FALLBACK.dmBody),
    };
  } catch {
    return SAFE_FALLBACK;
  }
}

export async function runOutreach(input: OutreachInput): Promise<OutreachOutput> {
  const audit = await db.query.careerAudits.findFirst({
    where: eq(careerAudits.userId, input.userId),
    orderBy: [desc(careerAudits.createdAt)],
  });
  if (!audit) throw new Error("no_audit_on_file");

  const ats = (audit.atsKeywordAnalysis as any) || {};
  const role = ats.target_role_used || ats.inferred_current_role || "Professional";
  const skills = Object.keys(audit.skillMap || {}).slice(0, 8).join(", ");
  const recipient = input.recipientName ? `Recipient: ${input.recipientName}${input.recipientTitle ? ` (${input.recipientTitle})` : ""}\n` : "";

  const profile = `${recipient}Candidate role: ${role}\nKey skills: ${skills}\nReadiness: ${audit.readinessScore ?? 0}%`;

  const raw = await parseResumeWithGemini(`${OUTREACH_PROMPT}\n${input.jdText}\n\nCANDIDATE:\n${profile}`, "");
  const draft = safeParse(raw);

  const [row] = await db.insert(outreachDrafts).values({
    userId: input.userId,
    jdId: input.jdId,
    recipientName: input.recipientName ?? null,
    recipientTitle: input.recipientTitle ?? null,
    emailSubject: draft.emailSubject,
    emailBody: draft.emailBody,
    dmBody: draft.dmBody,
  }).returning();

  return { id: row.id, emailSubject: row.emailSubject, emailBody: row.emailBody, dmBody: row.dmBody };
}
```

`npm test -- outreach-run` — must PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/gemini-prompts/outreach.ts src/lib/outreach/run.ts tests/outreach-run.test.ts
git commit -m "feat(outreach): prompt + run helper with safe fallback"
```

---

### Task 3: Outreach routes

**Files:**
- Create: `src/app/api/outreach/run/route.ts`
- Create: `src/app/api/outreach/[id]/route.ts`

- [ ] **Step 1: Run route**

Create `src/app/api/outreach/run/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST(req: NextRequest) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users, jds } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const { canUse, recordUsage } = await import("@/lib/billing/access");
  const quota = await canUse(dbUser.id, "outreach");
  if (!quota.allowed) {
    return NextResponse.json({
      success: false,
      error: "quota_exceeded",
      data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: "outreach" },
    }, { status: 402 });
  }

  const body = await req.json().catch(() => ({}));
  const jdId = Number(body.jdId);
  if (!Number.isFinite(jdId)) return NextResponse.json({ success: false, error: "jdId required" }, { status: 400 });

  const recipientName = typeof body.recipientName === "string" ? body.recipientName.trim().slice(0, 255) : undefined;
  const recipientTitle = typeof body.recipientTitle === "string" ? body.recipientTitle.trim().slice(0, 255) : undefined;

  const jd = await db.query.jds.findFirst({ where: and(eq(jds.id, jdId), eq(jds.userId, dbUser.id)) });
  if (!jd) return NextResponse.json({ success: false, error: "JD not found" }, { status: 404 });

  const { runOutreach } = await import("@/lib/outreach/run");
  try {
    const result = await runOutreach({
      userId: dbUser.id,
      jdId: jd.id,
      jdText: jd.rawText,
      recipientName,
      recipientTitle,
    });
    await recordUsage(dbUser.id, "outreach", { draftId: result.id });
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    if (err?.message === "no_audit_on_file") {
      return NextResponse.json({ success: false, error: "no_audit_on_file" }, { status: 400 });
    }
    console.error("outreach run failed:", err);
    return NextResponse.json({ success: false, error: "outreach_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Item route**

Create `src/app/api/outreach/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users, outreachDrafts } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const row = await db.query.outreachDrafts.findFirst({ where: eq(outreachDrafts.id, id) });
  if (!row) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  if (row.userId !== dbUser.id) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ success: true, data: row });
}
```

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/app/api/outreach
git commit -m "feat(outreach): /api/outreach/run + /api/outreach/[id]"
```

---

### Task 4: Outreach page

**Files:** `src/app/dashboard/tools/outreach/page.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { Loader2, Copy, Check } from "lucide-react";
import { JdInput } from "@/components/jd/JdInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeader } from "@/components/ui/section-header";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

export default function OutreachPage() {
  const [jd, setJd] = React.useState<any>(null);
  const [recipientName, setRecipientName] = React.useState("");
  const [recipientTitle, setRecipientTitle] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [draft, setDraft] = React.useState<any>(null);
  const [emailBody, setEmailBody] = React.useState("");
  const [emailSubject, setEmailSubject] = React.useState("");
  const [dmBody, setDmBody] = React.useState("");
  const [copied, setCopied] = React.useState<"email" | "dm" | null>(null);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState("");

  const generate = async () => {
    if (!jd) return;
    setBusy(true);
    try {
      const res = await fetch("/api/outreach/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jdId: jd.id,
          recipientName: recipientName.trim() || undefined,
          recipientTitle: recipientTitle.trim() || undefined,
        }),
      });
      const j = await res.json();
      if (res.status === 402) {
        setUpgradeReason("Outreach drafts are a Pro feature.");
        setUpgradeOpen(true);
      } else if (j.success) {
        setDraft(j.data);
        setEmailSubject(j.data.emailSubject);
        setEmailBody(j.data.emailBody);
        setDmBody(j.data.dmBody);
      }
    } finally {
      setBusy(false);
    }
  };

  const copy = async (which: "email" | "dm") => {
    const text = which === "email" ? `Subject: ${emailSubject}\n\n${emailBody}` : dmBody;
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Tools / Outreach" title="Cold email + LinkedIn DM" description="Pro feature. Copy-only — we never send on your behalf." />

      {!jd ? (
        <JdInput onParsed={setJd} />
      ) : !draft ? (
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm font-semibold text-neutral-950">{jd.parsed.title || "Untitled role"}</p>
            <p className="text-xs text-neutral-500">{jd.parsed.company || "—"}</p>
          </Card>
          <Card className="p-5 space-y-3">
            <p className="text-xs font-semibold text-neutral-500">Recipient (optional)</p>
            <Input placeholder="Name (optional)" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            <Input placeholder="Title (optional, e.g. Engineering Manager)" value={recipientTitle} onChange={(e) => setRecipientTitle(e.target.value)} />
          </Card>
          <div className="flex justify-end">
            <Button onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Generate
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-950">Cold email</h3>
              <Button variant="outline" size="sm" onClick={() => copy("email")}>
                {copied === "email" ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                {copied === "email" ? "Copied" : "Copy"}
              </Button>
            </div>
            <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            <Textarea rows={10} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} />
          </Card>
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-950">LinkedIn DM</h3>
              <Button variant="outline" size="sm" onClick={() => copy("dm")}>
                {copied === "dm" ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                {copied === "dm" ? "Copied" : "Copy"}
              </Button>
            </div>
            <Textarea rows={6} value={dmBody} onChange={(e) => setDmBody(e.target.value)} />
            <p className={`text-[10px] ${dmBody.length > 300 ? "text-red-600" : "text-neutral-500"}`}>{dmBody.length}/300 characters</p>
          </Card>
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} />
    </div>
  );
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/tools/outreach
git commit -m "feat(outreach): generator page with copy-to-clipboard"
```

---

### Task 5: Simulation projection math (TDD-heavy)

**Files:**
- Create: `src/lib/simulate/project.ts`
- Create: `tests/simulate-project.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/simulate-project.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { project, type SkillLift, type ProjectionPoint } from "@/lib/simulate/project";

describe("project", () => {
  it("returns horizon+1 points", () => {
    const out = project({
      baselineLatest: { readiness: 60, marketMatch: 50 },
      baselineSlope: { readiness: 0, marketMatch: 0 },
      lifts: [],
      horizonMonths: 6,
    });
    expect(out.length).toBe(7);
  });

  it("zero lifts and zero slope gives flat line at baseline", () => {
    const out = project({
      baselineLatest: { readiness: 60, marketMatch: 50 },
      baselineSlope: { readiness: 0, marketMatch: 0 },
      lifts: [],
      horizonMonths: 3,
    });
    for (const p of out) {
      expect(p.readiness).toBe(60);
      expect(p.marketMatch).toBe(50);
    }
  });

  it("month 0 always equals baselineLatest", () => {
    const out = project({
      baselineLatest: { readiness: 70, marketMatch: 65 },
      baselineSlope: { readiness: 1, marketMatch: 2 },
      lifts: [{ skill: "k8s", readinessLift: 5, marketMatchLift: 8 }],
      horizonMonths: 6,
    });
    expect(out[0].month).toBe(0);
    expect(out[0].readiness).toBe(70);
    expect(out[0].marketMatch).toBe(65);
  });

  it("readiness is monotonically non-decreasing with positive slope and lift", () => {
    const out = project({
      baselineLatest: { readiness: 60, marketMatch: 50 },
      baselineSlope: { readiness: 1, marketMatch: 1 },
      lifts: [{ skill: "x", readinessLift: 10, marketMatchLift: 10 }],
      horizonMonths: 12,
    });
    for (let i = 1; i < out.length; i++) {
      expect(out[i].readiness).toBeGreaterThanOrEqual(out[i - 1].readiness);
      expect(out[i].marketMatch).toBeGreaterThanOrEqual(out[i - 1].marketMatch);
    }
  });

  it("lift is capped at 100", () => {
    const out = project({
      baselineLatest: { readiness: 95, marketMatch: 90 },
      baselineSlope: { readiness: 0, marketMatch: 0 },
      lifts: [{ skill: "x", readinessLift: 50, marketMatchLift: 50 }],
      horizonMonths: 6,
    });
    expect(out[out.length - 1].readiness).toBeLessThanOrEqual(100);
    expect(out[out.length - 1].marketMatch).toBeLessThanOrEqual(100);
  });

  it("sums multiple lifts", () => {
    const out = project({
      baselineLatest: { readiness: 50, marketMatch: 50 },
      baselineSlope: { readiness: 0, marketMatch: 0 },
      lifts: [
        { skill: "a", readinessLift: 5, marketMatchLift: 3 },
        { skill: "b", readinessLift: 7, marketMatchLift: 4 },
      ],
      horizonMonths: 12,
    });
    // At horizon end, full lift applied => readiness 50 + 12 (5+7) = 62 (rounded), marketMatch 50 + 7
    expect(out[out.length - 1].readiness).toBeCloseTo(62, 0);
    expect(out[out.length - 1].marketMatch).toBeCloseTo(57, 0);
  });

  it("horizon=1 returns 2 points", () => {
    const out = project({
      baselineLatest: { readiness: 50, marketMatch: 50 },
      baselineSlope: { readiness: 0, marketMatch: 0 },
      lifts: [{ skill: "x", readinessLift: 4, marketMatchLift: 4 }],
      horizonMonths: 1,
    });
    expect(out.length).toBe(2);
  });
});
```

`npm test -- simulate-project` — must FAIL.

- [ ] **Step 2: Implement**

Create `src/lib/simulate/project.ts`:

```ts
export interface SkillLift {
  skill: string;
  readinessLift: number;
  marketMatchLift: number;
}

export interface ProjectionPoint {
  month: number;
  readiness: number;
  marketMatch: number;
}

export interface ProjectInput {
  baselineLatest: { readiness: number; marketMatch: number };
  baselineSlope: { readiness: number; marketMatch: number };
  lifts: SkillLift[];
  horizonMonths: number;
}

/**
 * Sigmoid-shaped lift application across the horizon.
 * t in [0, 1]; returns fraction of full lift applied at that point.
 * Designed so 10% by t=0.3, 50% by t=0.6, 90% by t=1.0.
 */
function liftFraction(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  // Logistic curve fitted approximately: 1 / (1 + exp(-k*(t - midpoint)))
  // With midpoint=0.6 and k=6 we get the requested 10/50/90 shape (close enough).
  const k = 6;
  const mid = 0.6;
  const raw = 1 / (1 + Math.exp(-k * (t - mid)));
  // Normalize so f(0)=0 and f(1)=1 exactly
  const f0 = 1 / (1 + Math.exp(-k * (0 - mid)));
  const f1 = 1 / (1 + Math.exp(-k * (1 - mid)));
  return (raw - f0) / (f1 - f0);
}

export function project(input: ProjectInput): ProjectionPoint[] {
  const totalReadinessLift = input.lifts.reduce((s, l) => s + (l.readinessLift || 0), 0);
  const totalMarketLift = input.lifts.reduce((s, l) => s + (l.marketMatchLift || 0), 0);

  const points: ProjectionPoint[] = [];
  for (let m = 0; m <= input.horizonMonths; m++) {
    const t = input.horizonMonths === 0 ? 1 : m / input.horizonMonths;
    const f = liftFraction(t);

    const baseReadiness = input.baselineLatest.readiness + input.baselineSlope.readiness * m;
    const baseMarket = input.baselineLatest.marketMatch + input.baselineSlope.marketMatch * m;

    const readiness = Math.min(100, baseReadiness + totalReadinessLift * f);
    const marketMatch = Math.min(100, baseMarket + totalMarketLift * f);

    points.push({
      month: m,
      readiness: Math.round(readiness * 10) / 10,
      marketMatch: Math.round(marketMatch * 10) / 10,
    });
  }
  return points;
}

/**
 * Simple slope from a series of audit points (linear regression on month index).
 * Returns slope per month for readiness + marketMatch.
 */
export function computeSlope(history: { date: string; readiness: number; marketMatch: number }[]): { readiness: number; marketMatch: number } {
  if (history.length < 2) return { readiness: 0, marketMatch: 0 };
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const monthsSpan = Math.max(1, (new Date(last.date).getTime() - new Date(first.date).getTime()) / (30 * 24 * 60 * 60 * 1000));
  return {
    readiness: (last.readiness - first.readiness) / monthsSpan,
    marketMatch: (last.marketMatch - first.marketMatch) / monthsSpan,
  };
}
```

`npm test -- simulate-project` — must PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/simulate/project.ts tests/simulate-project.test.ts
git commit -m "feat(simulate): pure projection math with sigmoid lift curve"
```

---

### Task 6: Simulation prompt + run helper

**Files:**
- Create: `src/lib/gemini-prompts/simulate.ts`
- Create: `src/lib/simulate/run.ts`

- [ ] **Step 1: Prompt**

Create `src/lib/gemini-prompts/simulate.ts`:

```ts
export const SIMULATE_PROMPT = `You are estimating how a candidate's readiness and market-match would change if they learned specific skills.

INPUT: a candidate's current skill map, target role, and a list of skills they plan to learn.

For EACH chosen skill, estimate:
- readinessLift (integer 0-15): percentage points added to overall readiness
- marketMatchLift (integer 0-15): percentage points added to market match for the target role
- why: one short sentence citing the role market

ALSO suggest up to 3 different skills NOT in their chosen list that would have the highest impact for the target role.

OUTPUT EXACTLY this JSON (no markdown):
{
  "lifts": [
    { "skill": "string", "readinessLift": 0, "marketMatchLift": 0, "why": "string" }
  ],
  "suggestedSkills": [
    { "skill": "string", "readinessLift": 0, "marketMatchLift": 0, "why": "string" }
  ]
}

CONTEXT:
`;
```

- [ ] **Step 2: Run helper**

Create `src/lib/simulate/run.ts`:

```ts
import { db } from "@/db";
import { simulations, careerAudits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { parseResumeWithGemini } from "@/lib/gemini";
import { SIMULATE_PROMPT } from "@/lib/gemini-prompts/simulate";
import { project, computeSlope, type SkillLift, type ProjectionPoint } from "./project";

export interface RunSimulationInput {
  userId: number;
  targetSkills: string[];
  horizonMonths: number;
}

export interface SuggestedSkill extends SkillLift {
  why: string;
}

export interface SimulationResult {
  id: number;
  series: ProjectionPoint[];
  suggestedSkills: SuggestedSkill[];
  targetSkills: string[];
  horizonMonths: number;
}

interface GeminiResponse {
  lifts: SuggestedSkill[];
  suggestedSkills: SuggestedSkill[];
}

const EMPTY: GeminiResponse = { lifts: [], suggestedSkills: [] };

function safeParse(raw: string): GeminiResponse {
  try {
    const m = raw.match(/```json\s*([\s\S]*?)\s*```/);
    const json = JSON.parse(m ? m[1] : raw);
    const sanitizeArray = (arr: any): SuggestedSkill[] => Array.isArray(arr)
      ? arr.map((x: any) => ({
          skill: String(x.skill ?? ""),
          readinessLift: Math.max(0, Math.min(15, Number(x.readinessLift) || 0)),
          marketMatchLift: Math.max(0, Math.min(15, Number(x.marketMatchLift) || 0)),
          why: String(x.why ?? ""),
        }))
      : [];
    return {
      lifts: sanitizeArray(json.lifts),
      suggestedSkills: sanitizeArray(json.suggestedSkills),
    };
  } catch {
    return EMPTY;
  }
}

export async function runSimulation(input: RunSimulationInput): Promise<SimulationResult> {
  // Fetch last 6 audits in chronological order
  const auditsDesc = await db.query.careerAudits.findMany({
    where: eq(careerAudits.userId, input.userId),
    orderBy: [desc(careerAudits.createdAt)],
    limit: 6,
  });
  if (auditsDesc.length === 0) throw new Error("no_audit_on_file");

  const history = auditsDesc.map((a) => ({
    date: (a.createdAt ?? new Date()).toISOString(),
    readiness: a.readinessScore ?? 0,
    marketMatch: a.marketMatchScore ?? 0,
  }));
  const slope = computeSlope(history);
  const latest = history[0];

  const auditTop = auditsDesc[0];
  const ats = (auditTop.atsKeywordAnalysis as any) || {};
  const targetRole = ats.target_role_used || ats.inferred_current_role || "Professional";
  const skillMap = (auditTop.skillMap as Record<string, number>) || {};

  const context = `Target role: ${targetRole}\nCurrent skills: ${JSON.stringify(skillMap)}\nReadiness today: ${latest.readiness}\nMarket match today: ${latest.marketMatch}\nSkills to learn: ${input.targetSkills.join(", ")}`;
  const raw = await parseResumeWithGemini(`${SIMULATE_PROMPT}\n${context}`, "");
  const parsed = safeParse(raw);

  const series = project({
    baselineLatest: { readiness: latest.readiness, marketMatch: latest.marketMatch },
    baselineSlope: slope,
    lifts: parsed.lifts.map((l) => ({ skill: l.skill, readinessLift: l.readinessLift, marketMatchLift: l.marketMatchLift })),
    horizonMonths: input.horizonMonths,
  });

  // Upsert (one row per user)
  const existing = await db.query.simulations.findFirst({ where: eq(simulations.userId, input.userId) });
  if (existing) {
    await db.update(simulations).set({
      targetSkills: input.targetSkills,
      horizonMonths: input.horizonMonths,
      series,
      suggestedSkills: parsed.suggestedSkills,
      updatedAt: new Date(),
    }).where(eq(simulations.id, existing.id));
    return { id: existing.id, series, suggestedSkills: parsed.suggestedSkills, targetSkills: input.targetSkills, horizonMonths: input.horizonMonths };
  }

  const [row] = await db.insert(simulations).values({
    userId: input.userId,
    targetSkills: input.targetSkills,
    horizonMonths: input.horizonMonths,
    series,
    suggestedSkills: parsed.suggestedSkills,
  }).returning();
  return { id: row.id, series, suggestedSkills: parsed.suggestedSkills, targetSkills: input.targetSkills, horizonMonths: input.horizonMonths };
}
```

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/lib/gemini-prompts/simulate.ts src/lib/simulate/run.ts
git commit -m "feat(simulate): orchestrator with baseline slope + Gemini lifts + upsert"
```

---

### Task 7: Simulation routes

**Files:**
- Create: `src/app/api/simulate/run/route.ts`
- Create: `src/app/api/simulate/latest/route.ts`

- [ ] **Step 1: Run route**

Create `src/app/api/simulate/run/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

const ALLOWED_HORIZONS = new Set([1, 3, 6, 12]);

export async function POST(req: NextRequest) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const { canUse, recordUsage } = await import("@/lib/billing/access");
  const quota = await canUse(dbUser.id, "simulation");
  if (!quota.allowed) {
    return NextResponse.json({
      success: false,
      error: "quota_exceeded",
      data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: "simulation" },
    }, { status: 402 });
  }

  const body = await req.json().catch(() => ({}));
  const targetSkills = Array.isArray(body.targetSkills)
    ? body.targetSkills.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 8)
    : [];
  const horizonMonths = Number(body.horizonMonths);

  if (targetSkills.length === 0) {
    return NextResponse.json({ success: false, error: "Choose at least 1 skill" }, { status: 400 });
  }
  if (!ALLOWED_HORIZONS.has(horizonMonths)) {
    return NextResponse.json({ success: false, error: "horizonMonths must be 1, 3, 6, or 12" }, { status: 400 });
  }

  const { runSimulation } = await import("@/lib/simulate/run");
  try {
    const result = await runSimulation({ userId: dbUser.id, targetSkills, horizonMonths });
    await recordUsage(dbUser.id, "simulation", { simulationId: result.id });
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    if (err?.message === "no_audit_on_file") {
      return NextResponse.json({ success: false, error: "no_audit_on_file" }, { status: 400 });
    }
    console.error("simulation run failed:", err);
    return NextResponse.json({ success: false, error: "simulation_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Latest route**

Create `src/app/api/simulate/latest/route.ts`:

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
  const { users, simulations } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: true, data: null });

  const row = await db.query.simulations.findFirst({ where: eq(simulations.userId, dbUser.id) });
  return NextResponse.json({ success: true, data: row ?? null });
}
```

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/app/api/simulate
git commit -m "feat(simulate): /api/simulate/run + /api/simulate/latest"
```

---

### Task 8: Simulation page

**Files:** `src/app/dashboard/tools/simulate/page.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { Loader2, X, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/ui/section-header";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

const HORIZONS = [1, 3, 6, 12];

export default function SimulatePage() {
  const [skills, setSkills] = React.useState<string[]>([]);
  const [skillInput, setSkillInput] = React.useState("");
  const [horizon, setHorizon] = React.useState(6);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [suggestedFromAudit, setSuggestedFromAudit] = React.useState<string[]>([]);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState("");

  // Pre-fill with skill_gaps from latest audit, and load latest simulation if any
  React.useEffect(() => {
    fetch("/api/dashboard/data", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.audit?.atsKeywordAnalysis?.skill_gaps) {
          setSuggestedFromAudit(j.data.audit.atsKeywordAnalysis.skill_gaps.slice(0, 8));
        }
      })
      .catch(() => {});
    fetch("/api/simulate/latest", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) {
          setResult(j.data);
          setSkills(j.data.targetSkills || []);
          setHorizon(j.data.horizonMonths || 6);
        }
      })
      .catch(() => {});
  }, []);

  const addSkill = (s: string) => {
    const trimmed = s.trim();
    if (!trimmed || skills.includes(trimmed) || skills.length >= 8) return;
    setSkills([...skills, trimmed]);
    setSkillInput("");
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const run = async () => {
    if (skills.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/simulate/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetSkills: skills, horizonMonths: horizon }),
      });
      const j = await res.json();
      if (res.status === 402) {
        setUpgradeReason("Career simulation is a Pro feature.");
        setUpgradeOpen(true);
      } else if (j.success) {
        setResult(j.data);
      }
    } finally {
      setBusy(false);
    }
  };

  const chartData = result?.series ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Tools / Simulate"
        title="What if I learn these skills?"
        description="Estimates based on your audit history + Gemini lift estimates. Not a guarantee."
      />

      <Card className="p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-neutral-500 mb-2">Skills to learn ({skills.length}/8)</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {skills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 rounded-full bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-white">
                {s}
                <button onClick={() => removeSkill(s)} className="hover:opacity-80"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill (e.g. kubernetes)"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(skillInput); } }}
            />
            <Button variant="outline" onClick={() => addSkill(skillInput)} disabled={!skillInput.trim() || skills.length >= 8}>Add</Button>
          </div>
          {suggestedFromAudit.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">From your skill gaps:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedFromAudit.filter((s) => !skills.includes(s)).map((s) => (
                  <button
                    key={s}
                    onClick={() => addSkill(s)}
                    disabled={skills.length >= 8}
                    className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >+ {s}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-neutral-500 mb-2">Horizon</p>
          <div className="flex gap-2">
            {HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full ${horizon === h ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-700"}`}
              >{h} {h === 1 ? "month" : "months"}</button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={run} disabled={busy || skills.length === 0}>
            {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            Run simulation
          </Button>
        </div>
      </Card>

      {result && (
        <>
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-neutral-950">Projected curve</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#F5F5F5" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} label={{ value: "Months from now", position: "insideBottom", offset: -5, fontSize: 10, fill: "#A3A3A3" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="readiness" name="Readiness" stroke="#0A0A0A" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="marketMatch" name="Market match" stroke="#737373" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {result.suggestedSkills && result.suggestedSkills.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 text-sm font-semibold text-neutral-950 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-neutral-700" />
                Fastest-impact alternatives
              </h3>
              <div className="grid gap-3 md:grid-cols-3">
                {result.suggestedSkills.map((s: any) => (
                  <div key={s.skill} className="rounded-md border border-neutral-200 bg-white p-3">
                    <p className="text-sm font-semibold text-neutral-950">{s.skill}</p>
                    <p className="text-xs text-neutral-700 mt-1">+{s.readinessLift}% readiness · +{s.marketMatchLift}% market</p>
                    <p className="mt-2 text-[11px] italic text-neutral-500">{s.why}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} />
    </div>
  );
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/tools/simulate
git commit -m "feat(simulate): page with skill picker + chart + suggestions"
```

---

### Task 9: Tools hub + nav

**Files:**
- Create: `src/app/dashboard/tools/page.tsx`
- Modify: `src/app/dashboard/client-layout.tsx`

- [ ] **Step 1: Hub page**

Create `src/app/dashboard/tools/page.tsx`:

```tsx
import Link from "next/link";
import { Mail, TrendingUp, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";

const TOOLS = [
  {
    href: "/dashboard/tools/outreach",
    icon: Mail,
    title: "Outreach drafts",
    description: "Generate a cold email + LinkedIn DM tailored to a JD. Copy-only — we never send for you.",
  },
  {
    href: "/dashboard/tools/simulate",
    icon: TrendingUp,
    title: "Career simulation",
    description: "Project how readiness and market match change if you learn specific skills.",
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="Tools" title="Pro toolkit" description="Two AI helpers for outreach and planning." />

      <div className="grid gap-4 md:grid-cols-2">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="p-6 hover:border-neutral-300 transition-colors h-full">
              <div className="flex items-start justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100">
                  <t.icon className="h-5 w-5 text-neutral-700" />
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                  <Sparkles className="h-2.5 w-2.5" /> Pro
                </span>
              </div>
              <h3 className="text-base font-semibold text-neutral-950">{t.title}</h3>
              <p className="mt-1 text-sm text-neutral-500">{t.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Nav**

In `src/app/dashboard/client-layout.tsx` `navLinks` array, add `{ href: "/dashboard/tools", label: "Tools" }` between AI Interview and Settings.

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/tools/page.tsx src/app/dashboard/client-layout.tsx
git commit -m "feat(tools): hub index + Tools nav link"
```

---

### Task 10: Final verification + push

- [ ] **Step 1: Test suite**

```bash
npm test 2>&1 | tail -10
```

Expected: all suites passing (Phase 4B added schema-phase4b, outreach-run, simulate-project — ~14 new tests on top of 112 from 4A).

- [ ] **Step 2: TS + lint**

```bash
npx tsc --noEmit 2>&1 | tail -5
npm run lint 2>&1 | tail -5
```

Both clean (lint may surface pre-existing warnings only).

- [ ] **Step 3: Apply migration**

```bash
set -a && source .env && set +a && npx drizzle-kit push 2>&1 | tail -5
```

- [ ] **Step 4: Push**

```bash
git push -u origin phase-4b-outreach-simulation 2>&1 | tail -5
```

- [ ] **Step 5: Local smoke (skip if no live env)**

```bash
npm run dev
```

Pro user manual checks:
1. `/dashboard/tools` → see two cards.
2. Outreach: paste Greenhouse JD → optional recipient name → Generate → email + DM panels render with copy buttons.
3. Simulate: see skill chips pre-filled from gaps → add 2 skills → 6mo horizon → Run → chart renders with two monotonic lines, suggestions card shows 3 alternatives.
4. Free user → both pages → 402 → UpgradeModal.

---

## Self-review

**Spec coverage:**

| Spec section | Tasks |
|---|---|
| §4 architecture | all |
| §5 schema | 1 |
| §6.1 outreach | 2, 3, 4 |
| §6.2 simulation | 5, 6, 7, 8 |
| §6.3 quota kinds | 1 |
| §6.4 tools hub | 9 |
| §6.5 nav | 9 |
| §10 rollout | 10 |

Coverage clean.

**Placeholder scan:** No "TBD", no "implement later", no "add error handling". Each step has actual code.

**Type consistency:** `SkillLift`, `ProjectionPoint`, `SuggestedSkill` defined in Task 5 + 6 and consumed in Task 8. `OutreachInput`/`OutreachOutput` from Task 2 used by Task 3 route. `RunSimulationInput`/`SimulationResult` from Task 6 used by Task 7. Quota kind names (`"outreach"`, `"simulation"`) match the `UsageKind` extension from Task 1.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-10-phase-4b-outreach-simulation.md`.**
