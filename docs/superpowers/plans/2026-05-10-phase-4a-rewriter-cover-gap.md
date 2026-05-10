# Phase 4A — Resume Rewriter + JD Gap Analyzer + Cover Letter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Pro AI moat — a JD-aware resume rewriter (PDF + LaTeX), JD gap analyzer with free-tier teaser, and cover letter generator — all gated by Phase 3 quotas.

**Architecture:** A shared JD-parsing pipeline (allowlisted fetch + Gemini parse + content-hash cache) feeds three downstream features. Each feature persists its own output table; UI lives under `/dashboard/resume` as tabs. LaTeX flow does region detection + diff application; ships modified `.tex` only (no server-side compile in v1).

**Tech Stack:** Next.js 16 · Drizzle/Neon · Gemini 2.5 Flash · `docx` (already a dep) · Vitest. No new deps.

**Hard constraints:**
- Landing page + 3D cloud — UNTOUCHED.
- All UI uses Phase 1 monochrome tokens.
- Branch: `phase-4a-rewriter-cover-gap`, stacked on `phase-3-dodo-billing`.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/lib/jd/allowlist.ts` | Pure hostname check + SSRF guard helper |
| `src/lib/jd/fetch.ts` | Fetch + sanitize JD HTML to plain text |
| `src/lib/jd/parse.ts` | Gemini-powered JD parser (`parseJd(text)`) |
| `src/lib/jd/cache.ts` | DB cache by `contentHash` |
| `src/lib/rewriter/diff.ts` | Pure diff-segment generator |
| `src/lib/rewriter/latex.ts` | LaTeX region detection + edit application |
| `src/lib/rewriter/run.ts` | Orchestrate PDF or LaTeX rewriter |
| `src/lib/rewriter/docx.ts` | Render rewritten resume → `.docx` |
| `src/lib/cover-letter/run.ts` | Generate cover letter w/ tone |
| `src/lib/gap/run.ts` | Compute coverage + suggestions |
| `src/lib/gemini-prompts/jd-parse.ts` | JD-parse prompt template |
| `src/lib/gemini-prompts/rewriter.ts` | Rewriter prompt template |
| `src/lib/gemini-prompts/cover-letter.ts` | Cover letter prompt template |
| `src/lib/gemini-prompts/gap.ts` | Gap analyzer prompt template |
| `src/app/api/jd/parse/route.ts` | POST: parse + cache |
| `src/app/api/rewriter/run/route.ts` | POST: gated, generates rewriter version |
| `src/app/api/rewriter/[id]/route.ts` | GET: load, PATCH: update accepted bullets |
| `src/app/api/rewriter/[id]/download/route.ts` | GET: download .docx or .tex |
| `src/app/api/cover-letter/run/route.ts` | POST: gated, generates letter |
| `src/app/api/cover-letter/[id]/route.ts` | GET / PATCH (edit body) |
| `src/app/api/cover-letter/[id]/download/route.ts` | GET: .docx |
| `src/app/api/gap-analyze/run/route.ts` | POST: gap report |
| `src/app/dashboard/resume/_tabs.tsx` | Tab strip primitive shared by sub-routes |
| `src/app/dashboard/resume/rewrite/page.tsx` | Rewriter intake + version list |
| `src/app/dashboard/resume/rewrite/[id]/page.tsx` | Diff viewer |
| `src/app/dashboard/resume/cover-letter/page.tsx` | Cover letter generator |
| `src/app/dashboard/resume/gap-analyze/page.tsx` | Gap report |
| `src/components/jd/JdInput.tsx` | URL or paste input with allowlist hint |
| `src/components/rewriter/DiffViewer.tsx` | Per-bullet accept/reject |

### Modified files

| Path | Why |
|---|---|
| `src/db/schema.ts` | add `jds`, `resumeVersions`, `coverLetters`, `gapReports` |
| `src/app/dashboard/resume/page.tsx` | mount tab strip; existing audit content becomes default tab |

---

## Task Index

1. Schema migration (4 new tables)
2. JD allowlist + SSRF guard
3. JD fetch + sanitize
4. JD parser (Gemini wrapper)
5. JD cache + `/api/jd/parse` route
6. Rewriter diff helper
7. Rewriter LaTeX region detection
8. Rewriter docx renderer
9. Rewriter prompt + run orchestrator
10. `/api/rewriter/run` route (gated)
11. `/api/rewriter/[id]` GET/PATCH route
12. `/api/rewriter/[id]/download` route
13. Cover letter prompt + run + routes
14. Gap analyzer + route
15. JdInput component
16. DiffViewer component
17. Resume page tab strip
18. Rewriter pages (intake + diff)
19. Cover letter page
20. Gap analyze page
21. Final verification + push

---

### Task 1: Schema migration

**Files:**
- Modify: `src/db/schema.ts`
- Create: `tests/schema-phase4a.test.ts`
- Generate: `drizzle/0003_phase4a.sql`

- [ ] **Step 1: Failing test**

Create `tests/schema-phase4a.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { jds, resumeVersions, coverLetters, gapReports } from "@/db/schema";

describe("phase 4A schema", () => {
  it("jds has required columns", () => {
    const cols = Object.keys(jds);
    for (const c of ["id", "userId", "sourceUrl", "contentHash", "rawText", "parsed", "createdAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("resumeVersions has required columns", () => {
    const cols = Object.keys(resumeVersions);
    for (const c of ["id", "userId", "jdId", "sourceKind", "originalTex", "modifiedTex", "rewrittenBullets", "diffSegments", "status", "error", "createdAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("coverLetters has required columns", () => {
    const cols = Object.keys(coverLetters);
    for (const c of ["id", "userId", "jdId", "tone", "body", "createdAt"]) {
      expect(cols).toContain(c);
    }
  });

  it("gapReports has required columns", () => {
    const cols = Object.keys(gapReports);
    for (const c of ["id", "userId", "jdId", "coverage", "suggestions", "createdAt"]) {
      expect(cols).toContain(c);
    }
  });
});
```

`npm test -- schema-phase4a` — must FAIL.

- [ ] **Step 2: Update schema**

Append to `src/db/schema.ts`:

```ts
export const jds = pgTable(
  "jds",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    sourceUrl: varchar("source_url", { length: 1024 }),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    rawText: text("raw_text").notNull(),
    parsed: jsonb("parsed"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userHashUnique: uniqueIndex("jds_user_hash_unique").on(t.userId, t.contentHash),
  })
);

export const resumeVersions = pgTable("resume_versions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jdId: integer("jd_id").references(() => jds.id),
  sourceKind: varchar("source_kind", { length: 10 }).notNull(),
  originalTex: text("original_tex"),
  modifiedTex: text("modified_tex"),
  rewrittenBullets: jsonb("rewritten_bullets"),
  diffSegments: jsonb("diff_segments"),
  status: varchar("status", { length: 20 }).notNull().default("ready"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const coverLetters = pgTable("cover_letters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jdId: integer("jd_id").references(() => jds.id),
  tone: varchar("tone", { length: 30 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gapReports = pgTable("gap_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jdId: integer("jd_id").references(() => jds.id),
  coverage: jsonb("coverage"),
  suggestions: jsonb("suggestions"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

`npm test -- schema-phase4a` — must PASS (4).

- [ ] **Step 3: Generate migration**

```bash
DATABASE_URL=postgresql://placeholder:placeholder@localhost/placeholder npx drizzle-kit generate
```

A new SQL file under `drizzle/` should appear with 4 CREATE TABLE + 1 unique index.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts drizzle/ tests/schema-phase4a.test.ts
git commit -m "feat(db): add jds + resume_versions + cover_letters + gap_reports tables"
```

---

### Task 2: JD allowlist + SSRF guard

**Files:**
- Create: `src/lib/jd/allowlist.ts`
- Create: `tests/jd-allowlist.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/jd-allowlist.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isAllowlistedHost, isPrivateHostname } from "@/lib/jd/allowlist";

describe("isAllowlistedHost", () => {
  it("accepts greenhouse.io subdomain", () => {
    expect(isAllowlistedHost("boards.greenhouse.io")).toBe(true);
  });
  it("accepts lever.co subdomain", () => {
    expect(isAllowlistedHost("jobs.lever.co")).toBe(true);
  });
  it("rejects example.com", () => {
    expect(isAllowlistedHost("example.com")).toBe(false);
  });
  it("rejects greenhouse.io.evil.com", () => {
    expect(isAllowlistedHost("greenhouse.io.evil.com")).toBe(false);
  });
  it("accepts workday + myworkdayjobs", () => {
    expect(isAllowlistedHost("careers.workday.com")).toBe(true);
    expect(isAllowlistedHost("careers.myworkdayjobs.com")).toBe(true);
  });
});

describe("isPrivateHostname", () => {
  it("flags localhost", () => {
    expect(isPrivateHostname("localhost")).toBe(true);
  });
  it("flags 127.0.0.1", () => {
    expect(isPrivateHostname("127.0.0.1")).toBe(true);
  });
  it("flags 10.0.0.5", () => {
    expect(isPrivateHostname("10.0.0.5")).toBe(true);
  });
  it("flags 192.168.1.1", () => {
    expect(isPrivateHostname("192.168.1.1")).toBe(true);
  });
  it("does not flag 8.8.8.8", () => {
    expect(isPrivateHostname("8.8.8.8")).toBe(false);
  });
});
```

`npm test -- jd-allowlist` — must FAIL.

- [ ] **Step 2: Implement**

Create `src/lib/jd/allowlist.ts`:

```ts
const ALLOWED_SUFFIXES = [
  "greenhouse.io",
  "lever.co",
  "linkedin.com",
  "indeed.com",
  "naukri.com",
  "ashbyhq.com",
  "workday.com",
  "myworkdayjobs.com",
];

export function isAllowlistedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return ALLOWED_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`));
}

export function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  // IPv4 ranges
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
  }
  // IPv6 loopback / link-local (rough check)
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}
```

`npm test -- jd-allowlist` — must PASS (10).

- [ ] **Step 3: Commit**

```bash
git add src/lib/jd/allowlist.ts tests/jd-allowlist.test.ts
git commit -m "feat(jd): allowlist + private-IP guard"
```

---

### Task 3: JD fetch + sanitize

**Files:**
- Create: `src/lib/jd/fetch.ts`
- Create: `tests/jd-fetch.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/jd-fetch.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sanitizeHtmlToText } from "@/lib/jd/fetch";

describe("sanitizeHtmlToText", () => {
  it("strips tags", () => {
    expect(sanitizeHtmlToText("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });
  it("collapses whitespace", () => {
    expect(sanitizeHtmlToText("<p>foo</p>\n\n\n<p>  bar  </p>")).toBe("foo\nbar");
  });
  it("strips scripts and styles", () => {
    expect(sanitizeHtmlToText("<style>x { y: 1 }</style><p>visible</p><script>evil()</script>")).toBe("visible");
  });
});
```

`npm test -- jd-fetch` — must FAIL.

- [ ] **Step 2: Implement**

Create `src/lib/jd/fetch.ts`:

```ts
import { isAllowlistedHost, isPrivateHostname } from "./allowlist";

const MAX_BYTES = 200 * 1024;

export function sanitizeHtmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export class JdFetchError extends Error {
  constructor(public code: "host_blocked" | "private_ip" | "fetch_failed" | "too_large", message: string) {
    super(message);
  }
}

export async function fetchJdText(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new JdFetchError("fetch_failed", "Invalid URL");
  }
  if (!isAllowlistedHost(parsed.hostname)) {
    throw new JdFetchError("host_blocked", "Host not allowed");
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new JdFetchError("private_ip", "Private hosts blocked");
  }

  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "CareerOS-JD-Fetcher/1.0" },
  });
  if (!res.ok) throw new JdFetchError("fetch_failed", `HTTP ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    if (text.length > MAX_BYTES) throw new JdFetchError("too_large", "JD too large");
    return sanitizeHtmlToText(text);
  }

  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      reader.cancel();
      throw new JdFetchError("too_large", "JD too large");
    }
    chunks.push(value);
  }
  const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return sanitizeHtmlToText(buf.toString("utf8"));
}
```

`npm test -- jd-fetch` — must PASS (3).

- [ ] **Step 3: Commit**

```bash
git add src/lib/jd/fetch.ts tests/jd-fetch.test.ts
git commit -m "feat(jd): sanitize HTML + size-capped allowlisted fetch"
```

---

### Task 4: JD parser (Gemini)

**Files:**
- Create: `src/lib/gemini-prompts/jd-parse.ts`
- Create: `src/lib/jd/parse.ts`
- Create: `tests/jd-parse.test.ts`

- [ ] **Step 1: Prompt template**

Create `src/lib/gemini-prompts/jd-parse.ts`:

```ts
export const JD_PARSE_PROMPT = `You are parsing a job description. Extract structured fields.

OUTPUT EXACTLY this JSON (no markdown, no commentary):
{
  "title": "string",
  "company": "string",
  "location": "string or null",
  "requirements": ["string", ...],
  "keywords": ["lowercased keyword", ...],
  "niceToHaves": ["string", ...]
}

Keep "keywords" to single technologies / skills / nouns. Lowercase. Dedupe.

JD TEXT:
`;
```

- [ ] **Step 2: Failing test**

Create `tests/jd-parse.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/gemini", () => ({
  parseResumeWithGemini: vi.fn(),
}));

import { parseJd } from "@/lib/jd/parse";

describe("parseJd", () => {
  it("returns parsed JD object on valid Gemini JSON", async () => {
    const { parseResumeWithGemini } = await import("@/lib/gemini");
    (parseResumeWithGemini as any).mockResolvedValue(JSON.stringify({
      title: "Senior SWE",
      company: "Acme",
      location: "Remote",
      requirements: ["5+ years"],
      keywords: ["typescript", "react"],
      niceToHaves: ["kubernetes"],
    }));
    const r = await parseJd("Some JD text");
    expect(r.title).toBe("Senior SWE");
    expect(r.keywords).toEqual(["typescript", "react"]);
  });

  it("falls back to safe shape on invalid JSON", async () => {
    const { parseResumeWithGemini } = await import("@/lib/gemini");
    (parseResumeWithGemini as any).mockResolvedValue("not json at all");
    const r = await parseJd("text");
    expect(r.title).toBe("");
    expect(Array.isArray(r.keywords)).toBe(true);
  });

  it("strips markdown fences", async () => {
    const { parseResumeWithGemini } = await import("@/lib/gemini");
    (parseResumeWithGemini as any).mockResolvedValue('```json\n{"title":"X","company":"Y","location":null,"requirements":[],"keywords":[],"niceToHaves":[]}\n```');
    const r = await parseJd("t");
    expect(r.title).toBe("X");
  });
});
```

`npm test -- jd-parse` — must FAIL.

- [ ] **Step 3: Implement**

Create `src/lib/jd/parse.ts`:

```ts
import { parseResumeWithGemini } from "@/lib/gemini";
import { JD_PARSE_PROMPT } from "@/lib/gemini-prompts/jd-parse";

export interface ParsedJd {
  title: string;
  company: string;
  location: string | null;
  requirements: string[];
  keywords: string[];
  niceToHaves: string[];
}

const EMPTY: ParsedJd = {
  title: "",
  company: "",
  location: null,
  requirements: [],
  keywords: [],
  niceToHaves: [],
};

export async function parseJd(text: string): Promise<ParsedJd> {
  const raw = await parseResumeWithGemini(`${JD_PARSE_PROMPT}\n\n${text}`, "");
  try {
    const m = raw.match(/```json\s*([\s\S]*?)\s*```/);
    const json = JSON.parse(m ? m[1] : raw);
    return {
      title: String(json.title ?? ""),
      company: String(json.company ?? ""),
      location: json.location ?? null,
      requirements: Array.isArray(json.requirements) ? json.requirements.map(String) : [],
      keywords: Array.isArray(json.keywords) ? json.keywords.map((k: any) => String(k).toLowerCase()) : [],
      niceToHaves: Array.isArray(json.niceToHaves) ? json.niceToHaves.map(String) : [],
    };
  } catch {
    return EMPTY;
  }
}
```

The existing `parseResumeWithGemini` in `src/lib/gemini.ts` accepts `(prompt, targetRole)` — passing empty `targetRole` is fine. If signatures differ, adapt the call.

`npm test -- jd-parse` — must PASS (3).

- [ ] **Step 4: Commit**

```bash
git add src/lib/gemini-prompts/jd-parse.ts src/lib/jd/parse.ts tests/jd-parse.test.ts
git commit -m "feat(jd): Gemini-powered JD parser"
```

---

### Task 5: JD cache + `/api/jd/parse` route

**Files:**
- Create: `src/lib/jd/cache.ts`
- Create: `src/app/api/jd/parse/route.ts`

- [ ] **Step 1: Cache helper**

Create `src/lib/jd/cache.ts`:

```ts
import { createHash } from "node:crypto";
import { db } from "@/db";
import { jds } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { parseJd, type ParsedJd } from "./parse";

export function contentHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 64);
}

export async function getOrCreateJd(input: {
  userId: number;
  rawText: string;
  sourceUrl?: string | null;
}): Promise<{ id: number; parsed: ParsedJd; rawText: string; sourceUrl: string | null }> {
  const hash = contentHash(input.rawText);

  const existing = await db.query.jds.findFirst({
    where: and(eq(jds.userId, input.userId), eq(jds.contentHash, hash)),
  });
  if (existing) {
    return {
      id: existing.id,
      parsed: existing.parsed as ParsedJd,
      rawText: existing.rawText,
      sourceUrl: existing.sourceUrl ?? null,
    };
  }

  const parsed = await parseJd(input.rawText);
  const [row] = await db.insert(jds).values({
    userId: input.userId,
    sourceUrl: input.sourceUrl ?? null,
    contentHash: hash,
    rawText: input.rawText,
    parsed,
  }).returning();
  return { id: row.id, parsed, rawText: row.rawText, sourceUrl: row.sourceUrl ?? null };
}
```

- [ ] **Step 2: Route**

Create `src/app/api/jd/parse/route.ts`:

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
  const { users } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() : "";
  let text = typeof body.text === "string" ? body.text.trim() : "";

  if (!url && !text) {
    return NextResponse.json({ success: false, error: "Provide url or text" }, { status: 400 });
  }

  if (url && !text) {
    try {
      const { fetchJdText } = await import("@/lib/jd/fetch");
      text = await fetchJdText(url);
    } catch (err: any) {
      const code = err?.code;
      if (code === "host_blocked") {
        return NextResponse.json({ success: false, error: "host_blocked", message: "We can't fetch that domain — paste the JD text instead." }, { status: 400 });
      }
      if (code === "too_large") {
        return NextResponse.json({ success: false, error: "too_large" }, { status: 413 });
      }
      return NextResponse.json({ success: false, error: "fetch_failed", message: "Couldn't fetch this JD. Try pasting the text." }, { status: 422 });
    }
  }

  if (!text || text.length < 50) {
    return NextResponse.json({ success: false, error: "JD text too short" }, { status: 400 });
  }

  const { getOrCreateJd } = await import("@/lib/jd/cache");
  const result = await getOrCreateJd({ userId: dbUser.id, rawText: text, sourceUrl: url || null });

  return NextResponse.json({ success: true, data: result });
}
```

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/lib/jd/cache.ts src/app/api/jd/parse
git commit -m "feat(jd): /api/jd/parse with content-hash cache"
```

---

### Task 6: Rewriter diff helper

**Files:**
- Create: `src/lib/rewriter/diff.ts`
- Create: `tests/rewriter-diff.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/rewriter-diff.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildDiffSegments } from "@/lib/rewriter/diff";

describe("buildDiffSegments", () => {
  it("creates one segment per bullet pair", () => {
    const segs = buildDiffSegments({
      sections: [{
        title: "Experience",
        originalBullets: ["Built A", "Built B"],
        rewrittenBullets: ["Architected A", "Shipped B"],
      }],
    });
    expect(segs.length).toBe(2);
    expect(segs[0].original).toBe("Built A");
    expect(segs[0].suggested).toBe("Architected A");
    expect(segs[0].accepted).toBe(null);
    expect(segs[0].section).toBe("Experience");
  });

  it("handles section count mismatch by truncating to min length", () => {
    const segs = buildDiffSegments({
      sections: [{
        title: "Experience",
        originalBullets: ["A", "B", "C"],
        rewrittenBullets: ["A2", "B2"],
      }],
    });
    expect(segs.length).toBe(2);
  });
});
```

`npm test -- rewriter-diff` — must FAIL.

- [ ] **Step 2: Implement**

Create `src/lib/rewriter/diff.ts`:

```ts
export interface DiffSegment {
  section: string;
  index: number;
  original: string;
  suggested: string;
  rationale?: string;
  accepted: boolean | null;
}

export interface RewriteSection {
  title: string;
  originalBullets: string[];
  rewrittenBullets: string[];
  rationale?: string;
}

export interface RewriteOutput {
  sections: RewriteSection[];
}

export function buildDiffSegments(out: RewriteOutput): DiffSegment[] {
  const segments: DiffSegment[] = [];
  for (const s of out.sections) {
    const n = Math.min(s.originalBullets.length, s.rewrittenBullets.length);
    for (let i = 0; i < n; i++) {
      segments.push({
        section: s.title,
        index: i,
        original: s.originalBullets[i],
        suggested: s.rewrittenBullets[i],
        rationale: s.rationale,
        accepted: null,
      });
    }
  }
  return segments;
}

export function applyAccepted(segments: DiffSegment[]): { section: string; bullets: string[] }[] {
  const bySection = new Map<string, string[]>();
  for (const s of segments) {
    const arr = bySection.get(s.section) ?? [];
    arr[s.index] = s.accepted === false ? s.original : s.suggested;
    bySection.set(s.section, arr);
  }
  return Array.from(bySection.entries()).map(([section, bullets]) => ({ section, bullets }));
}
```

`npm test -- rewriter-diff` — must PASS (2).

- [ ] **Step 3: Commit**

```bash
git add src/lib/rewriter/diff.ts tests/rewriter-diff.test.ts
git commit -m "feat(rewriter): pure diff-segment helper"
```

---

### Task 7: Rewriter LaTeX region detection

**Files:**
- Create: `src/lib/rewriter/latex.ts`
- Create: `tests/rewriter-latex.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/rewriter-latex.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { extractBullets, applyBulletEdits } from "@/lib/rewriter/latex";

const SAMPLE = String.raw`
\documentclass{article}
\begin{document}
\section{Education}
\textbf{MIT}, B.S. in CS

\section{Experience}
\textbf{Acme Corp} -- Senior Engineer
\begin{itemize}
\item Built service handling 10M req/day
\item Led team of 4 engineers
\end{itemize}

\section{Skills}
TypeScript, React
\end{document}
`;

describe("extractBullets", () => {
  it("finds items inside Experience section only", () => {
    const bullets = extractBullets(SAMPLE);
    expect(bullets.length).toBe(2);
    expect(bullets[0].text).toContain("Built service");
    expect(bullets[1].text).toContain("Led team");
  });

  it("skips Education and Skills sections", () => {
    const bullets = extractBullets(SAMPLE);
    expect(bullets.every((b) => !b.text.includes("MIT"))).toBe(true);
    expect(bullets.every((b) => !b.text.includes("TypeScript"))).toBe(true);
  });
});

describe("applyBulletEdits", () => {
  it("replaces bullet text in source preserving \\item", () => {
    const bullets = extractBullets(SAMPLE);
    const edits = bullets.map((b, i) => ({ ...b, suggested: `Edited ${i}` }));
    const out = applyBulletEdits(SAMPLE, edits);
    expect(out).toContain("\\item Edited 0");
    expect(out).toContain("\\item Edited 1");
    expect(out).not.toContain("\\item Built service");
  });

  it("returns input unchanged when no edits", () => {
    expect(applyBulletEdits(SAMPLE, [])).toBe(SAMPLE);
  });
});
```

`npm test -- rewriter-latex` — must FAIL.

- [ ] **Step 2: Implement**

Create `src/lib/rewriter/latex.ts`:

```ts
export interface LatexBullet {
  text: string;
  rawLine: string;
  section: string;
  start: number;
  end: number;
  suggested?: string;
}

const TARGET_SECTIONS = ["experience", "projects", "work experience"];

interface SectionRange { title: string; start: number; end: number; }

function findSectionRanges(src: string): SectionRange[] {
  const re = /\\(?:section|subsection)\*?\{([^}]+)\}/gi;
  const matches: { title: string; idx: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    matches.push({ title: m[1].trim(), idx: m.index });
  }
  const ranges: SectionRange[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].idx;
    const end = i + 1 < matches.length ? matches[i + 1].idx : src.length;
    ranges.push({ title: matches[i].title, start, end });
  }
  return ranges;
}

export function extractBullets(src: string): LatexBullet[] {
  const ranges = findSectionRanges(src);
  const bullets: LatexBullet[] = [];

  for (const r of ranges) {
    if (!TARGET_SECTIONS.some((t) => r.title.toLowerCase().includes(t))) continue;
    const slice = src.slice(r.start, r.end);
    const itemRe = /^[ \t]*\\(?:item|resumeItem)\b\{?([^\n]*)/gm;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(slice)) !== null) {
      const matchStart = r.start + m.index;
      const lineEnd = src.indexOf("\n", matchStart);
      const end = lineEnd === -1 ? src.length : lineEnd;
      const rawLine = src.slice(matchStart, end);
      const after = rawLine.replace(/^[ \t]*\\(?:item|resumeItem)\b\{?\s*/, "").replace(/\}\s*$/, "").trim();
      bullets.push({ text: after, rawLine, section: r.title, start: matchStart, end });
    }
  }
  return bullets;
}

export function applyBulletEdits(src: string, edits: (LatexBullet & { suggested?: string })[]): string {
  if (edits.length === 0) return src;
  // Replace from end to start to keep offsets valid
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of sorted) {
    if (!e.suggested) continue;
    const newLine = e.rawLine.replace(/^([ \t]*\\(?:item|resumeItem)\b\{?\s*)([\s\S]*?)(\}\s*)?$/, (_, head, _body, tail) => `${head}${e.suggested}${tail ?? ""}`);
    out = out.slice(0, e.start) + newLine + out.slice(e.end);
  }
  return out;
}
```

`npm test -- rewriter-latex` — must PASS (4).

- [ ] **Step 3: Commit**

```bash
git add src/lib/rewriter/latex.ts tests/rewriter-latex.test.ts
git commit -m "feat(rewriter): LaTeX region detection + safe edit application"
```

---

### Task 8: Rewriter docx renderer

**Files:**
- Create: `src/lib/rewriter/docx.ts`

- [ ] **Step 1: Implement**

Create `src/lib/rewriter/docx.ts`:

```ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { applyAccepted, type DiffSegment } from "./diff";

export async function renderDocxFromSegments(input: {
  candidateName: string;
  segments: DiffSegment[];
}): Promise<Buffer> {
  const grouped = applyAccepted(input.segments);

  const children: Paragraph[] = [];
  children.push(new Paragraph({
    children: [new TextRun({ text: input.candidateName || "Resume", bold: true, size: 32 })],
  }));

  for (const g of grouped) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: g.section, bold: true, size: 24 })],
    }));
    for (const b of g.bullets) {
      if (!b) continue;
      children.push(new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: b, size: 22 })],
      }));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  return Packer.toBuffer(doc);
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/lib/rewriter/docx.ts
git commit -m "feat(rewriter): .docx renderer from accepted segments"
```

---

### Task 9: Rewriter prompt + run orchestrator

**Files:**
- Create: `src/lib/gemini-prompts/rewriter.ts`
- Create: `src/lib/rewriter/run.ts`

- [ ] **Step 1: Prompt template**

Create `src/lib/gemini-prompts/rewriter.ts`:

```ts
export const REWRITER_PROMPT = `You are a resume rewriter. Given a candidate's resume bullets and a job description, rewrite each bullet to maximize ATS keyword coverage WHILE PRESERVING ACCURACY.

Rules:
- Never invent skills, technologies, or experience the candidate doesn't have.
- Each rewrite must trace to a fact in the original bullet.
- Inject JD keywords only where they fit the original work.
- Tighten verbs, add metrics if present in the original, and remove fluff.

OUTPUT EXACTLY this JSON (no markdown):
{
  "sections": [
    {
      "title": "Experience",
      "originalBullets": ["..."],
      "rewrittenBullets": ["..."],
      "rationale": "one short sentence"
    }
  ]
}

JOB DESCRIPTION:
`;
```

- [ ] **Step 2: Orchestrator**

Create `src/lib/rewriter/run.ts`:

```ts
import { db } from "@/db";
import { resumeVersions, careerAudits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { parseResumeWithGemini } from "@/lib/gemini";
import { REWRITER_PROMPT } from "@/lib/gemini-prompts/rewriter";
import { buildDiffSegments, type RewriteOutput } from "./diff";
import { extractBullets, applyBulletEdits } from "./latex";
import type { ParsedJd } from "@/lib/jd/parse";

export interface RunRewriterInput {
  userId: number;
  jdId: number;
  jdParsed: ParsedJd;
  jdText: string;
  source: { kind: "pdf" } | { kind: "latex"; tex: string };
}

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    const m = raw.match(/```json\s*([\s\S]*?)\s*```/);
    return JSON.parse(m ? m[1] : raw) as T;
  } catch {
    return fallback;
  }
}

export async function runRewriter(input: RunRewriterInput): Promise<{ versionId: number }> {
  const audit = await db.query.careerAudits.findFirst({
    where: eq(careerAudits.userId, input.userId),
    orderBy: [desc(careerAudits.createdAt)],
  });
  if (!audit) throw new Error("no_audit_on_file");

  if (input.source.kind === "pdf") {
    const ats = (audit.atsKeywordAnalysis as any) || {};
    const role = ats.target_role_used || "";
    const bullets = Array.isArray(ats.recommendations) ? ats.recommendations.map(String) : [];
    const skills = Object.keys(audit.skillMap || {});
    const inputBlob = `Role: ${role}\nSkills: ${skills.join(", ")}\nExisting bullets/notes:\n${bullets.join("\n")}`;

    const raw = await parseResumeWithGemini(`${REWRITER_PROMPT}\n${input.jdText}\n\nCANDIDATE PROFILE:\n${inputBlob}`, "");
    const parsed = safeParseJson<RewriteOutput>(raw, { sections: [] });
    const segments = buildDiffSegments(parsed);

    const [row] = await db.insert(resumeVersions).values({
      userId: input.userId,
      jdId: input.jdId,
      sourceKind: "pdf",
      rewrittenBullets: parsed,
      diffSegments: segments,
      status: "ready",
    }).returning();
    return { versionId: row.id };
  }

  // LaTeX path
  const tex = input.source.tex;
  const bullets = extractBullets(tex);

  if (bullets.length === 0) {
    const [row] = await db.insert(resumeVersions).values({
      userId: input.userId,
      jdId: input.jdId,
      sourceKind: "latex",
      originalTex: tex,
      modifiedTex: tex,
      diffSegments: [],
      status: "ready",
      error: "no_recognized_sections",
    }).returning();
    return { versionId: row.id };
  }

  const inputBlob = `Existing LaTeX bullets (one per line):\n${bullets.map((b) => b.text).join("\n")}`;
  const raw = await parseResumeWithGemini(`${REWRITER_PROMPT}\n${input.jdText}\n\nCANDIDATE PROFILE:\n${inputBlob}`, "");
  const parsed = safeParseJson<RewriteOutput>(raw, { sections: [] });

  // Map rewrites onto bullets in order
  const flatRewrites = parsed.sections.flatMap((s) => s.rewrittenBullets);
  const edits = bullets.map((b, i) => ({ ...b, suggested: flatRewrites[i] ?? b.text }));
  const modifiedTex = applyBulletEdits(tex, edits);

  // Build diff segments using a single synthetic section
  const segs = bullets.map((b, i) => ({
    section: b.section,
    index: i,
    original: b.text,
    suggested: flatRewrites[i] ?? b.text,
    accepted: null as boolean | null,
  }));

  const [row] = await db.insert(resumeVersions).values({
    userId: input.userId,
    jdId: input.jdId,
    sourceKind: "latex",
    originalTex: tex,
    modifiedTex,
    diffSegments: segs,
    status: "ready",
  }).returning();
  return { versionId: row.id };
}
```

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/lib/gemini-prompts/rewriter.ts src/lib/rewriter/run.ts
git commit -m "feat(rewriter): orchestrator for PDF + LaTeX flows"
```

---

### Task 10: `/api/rewriter/run` route

**Files:**
- Create: `src/app/api/rewriter/run/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

const MAX_TEX_BYTES = 5 * 1024 * 1024;

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
  const quota = await canUse(dbUser.id, "rewriter");
  if (!quota.allowed) {
    return NextResponse.json({
      success: false,
      error: "quota_exceeded",
      data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: "rewriter" },
    }, { status: 402 });
  }

  const body = await req.json().catch(() => ({}));
  const jdId = Number(body.jdId);
  if (!Number.isFinite(jdId)) return NextResponse.json({ success: false, error: "jdId required" }, { status: 400 });
  const sourceKind = body.sourceKind === "latex" ? "latex" : "pdf";

  const jd = await db.query.jds.findFirst({ where: and(eq(jds.id, jdId), eq(jds.userId, dbUser.id)) });
  if (!jd) return NextResponse.json({ success: false, error: "JD not found" }, { status: 404 });

  let tex: string | undefined;
  if (sourceKind === "latex") {
    if (typeof body.tex === "string" && body.tex.trim().length > 0) {
      tex = body.tex;
    } else if (typeof body.texUrl === "string") {
      try {
        const u = new URL(body.texUrl);
        const okHosts = ["raw.githubusercontent.com", "gist.githubusercontent.com", "overleaf.com"];
        if (!okHosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))) {
          return NextResponse.json({ success: false, error: "tex_host_blocked" }, { status: 400 });
        }
        const res = await fetch(body.texUrl);
        if (!res.ok) return NextResponse.json({ success: false, error: "tex_fetch_failed" }, { status: 422 });
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > MAX_TEX_BYTES) return NextResponse.json({ success: false, error: "tex_too_large" }, { status: 413 });
        tex = buf.toString("utf8");
      } catch {
        return NextResponse.json({ success: false, error: "tex_fetch_failed" }, { status: 422 });
      }
    } else {
      return NextResponse.json({ success: false, error: "tex or texUrl required for latex flow" }, { status: 400 });
    }
  }

  const { runRewriter } = await import("@/lib/rewriter/run");
  try {
    const result = await runRewriter({
      userId: dbUser.id,
      jdId: jd.id,
      jdParsed: jd.parsed as any,
      jdText: jd.rawText,
      source: sourceKind === "pdf" ? { kind: "pdf" } : { kind: "latex", tex: tex! },
    });
    await recordUsage(dbUser.id, "rewriter", { versionId: result.versionId });
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    if (err?.message === "no_audit_on_file") {
      return NextResponse.json({ success: false, error: "no_audit_on_file", message: "Upload your resume first." }, { status: 400 });
    }
    console.error("rewriter run failed:", err);
    return NextResponse.json({ success: false, error: "rewriter_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/app/api/rewriter/run
git commit -m "feat(rewriter): POST /api/rewriter/run (gated)"
```

---

### Task 11: `/api/rewriter/[id]` GET / PATCH

**Files:**
- Create: `src/app/api/rewriter/[id]/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

async function loadOwned(idStr: string) {
  const id = Number(idStr);
  if (!Number.isFinite(id)) return { error: "Invalid id", status: 400 as const };

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized", status: 401 as const };

  const { db } = await import("@/db");
  const { users, resumeVersions } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return { error: "Unknown user", status: 401 as const };

  const row = await db.query.resumeVersions.findFirst({ where: eq(resumeVersions.id, id) });
  if (!row) return { error: "Not found", status: 404 as const };
  if (row.userId !== dbUser.id) return { error: "Forbidden", status: 403 as const };

  return { row, dbUserId: dbUser.id };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const owned = await loadOwned(id);
  if ("error" in owned) return NextResponse.json({ success: false, error: owned.error }, { status: owned.status });
  return NextResponse.json({ success: true, data: owned.row });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const owned = await loadOwned(id);
  if ("error" in owned) return NextResponse.json({ success: false, error: owned.error }, { status: owned.status });

  const body = await req.json().catch(() => ({}));
  if (!Array.isArray(body.diffSegments)) {
    return NextResponse.json({ success: false, error: "diffSegments array required" }, { status: 400 });
  }

  const { db } = await import("@/db");
  const { resumeVersions } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  // For LaTeX, recompute modifiedTex from segments
  let modifiedTex: string | null = (owned.row.modifiedTex as string | null) ?? null;
  if (owned.row.sourceKind === "latex" && typeof owned.row.originalTex === "string") {
    const { extractBullets, applyBulletEdits } = await import("@/lib/rewriter/latex");
    const bullets = extractBullets(owned.row.originalTex);
    const segs = body.diffSegments as { index: number; suggested: string; original: string; accepted: boolean | null }[];
    const edits = bullets.map((b, i) => {
      const seg = segs[i];
      const text = seg && seg.accepted === false ? seg.original : seg?.suggested ?? b.text;
      return { ...b, suggested: text };
    });
    modifiedTex = applyBulletEdits(owned.row.originalTex, edits);
  }

  await db.update(resumeVersions).set({
    diffSegments: body.diffSegments,
    modifiedTex,
  }).where(eq(resumeVersions.id, owned.row.id));

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/app/api/rewriter/[id]/route.ts
git commit -m "feat(rewriter): GET/PATCH /api/rewriter/[id]"
```

---

### Task 12: `/api/rewriter/[id]/download` route

**Files:**
- Create: `src/app/api/rewriter/[id]/download/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users, resumeVersions } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const row = await db.query.resumeVersions.findFirst({ where: eq(resumeVersions.id, id) });
  if (!row) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  if (row.userId !== dbUser.id) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || (row.sourceKind === "latex" ? "tex" : "docx");

  if (format === "tex") {
    if (!row.modifiedTex) return NextResponse.json({ success: false, error: "no_tex" }, { status: 400 });
    return new NextResponse(row.modifiedTex, {
      status: 200,
      headers: {
        "Content-Type": "application/x-tex; charset=utf-8",
        "Content-Disposition": 'attachment; filename="resume.tex"',
      },
    });
  }

  if (format === "docx") {
    const { renderDocxFromSegments } = await import("@/lib/rewriter/docx");
    const segments = (row.diffSegments as any[]) || [];
    const buf = await renderDocxFromSegments({
      candidateName: dbUser.name || "Resume",
      segments,
    });
    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="resume.docx"',
      },
    });
  }

  return NextResponse.json({ success: false, error: "Invalid format" }, { status: 400 });
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/app/api/rewriter/[id]/download
git commit -m "feat(rewriter): GET /api/rewriter/[id]/download (.docx or .tex)"
```

---

### Task 13: Cover letter prompt + run + routes

**Files:**
- Create: `src/lib/gemini-prompts/cover-letter.ts`
- Create: `src/lib/cover-letter/run.ts`
- Create: `src/app/api/cover-letter/run/route.ts`
- Create: `src/app/api/cover-letter/[id]/route.ts`
- Create: `src/app/api/cover-letter/[id]/download/route.ts`

- [ ] **Step 1: Prompt**

Create `src/lib/gemini-prompts/cover-letter.ts`:

```ts
export const COVER_LETTER_PROMPT = (tone: string) => `Write a cover letter in a ${tone} tone.

Rules:
- 3 short paragraphs.
- First: hook + role + one specific reason for the company.
- Second: 2 concrete achievements from the candidate that match the JD's top requirements.
- Third: brief close + availability.
- Plain text. No markdown, no bullet points.

JD:
`;
```

- [ ] **Step 2: Run helper**

Create `src/lib/cover-letter/run.ts`:

```ts
import { db } from "@/db";
import { coverLetters, careerAudits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { parseResumeWithGemini } from "@/lib/gemini";
import { COVER_LETTER_PROMPT } from "@/lib/gemini-prompts/cover-letter";

export type Tone = "formal" | "conversational" | "concise";

export async function runCoverLetter(input: {
  userId: number;
  jdId: number;
  jdText: string;
  tone: Tone;
}): Promise<{ id: number; body: string }> {
  const audit = await db.query.careerAudits.findFirst({
    where: eq(careerAudits.userId, input.userId),
    orderBy: [desc(careerAudits.createdAt)],
  });
  if (!audit) throw new Error("no_audit_on_file");

  const ats = (audit.atsKeywordAnalysis as any) || {};
  const role = ats.target_role_used || ats.inferred_current_role || "Professional";
  const skills = Object.keys(audit.skillMap || {}).slice(0, 12).join(", ");

  const profile = `Candidate role: ${role}\nSkills: ${skills}\nReadiness: ${audit.readinessScore ?? 0}%`;
  const raw = await parseResumeWithGemini(`${COVER_LETTER_PROMPT(input.tone)}\n${input.jdText}\n\nCANDIDATE:\n${profile}`, "");

  const body = String(raw).replace(/```[\s\S]*?```/g, "").trim();

  const [row] = await db.insert(coverLetters).values({
    userId: input.userId,
    jdId: input.jdId,
    tone: input.tone,
    body,
  }).returning();
  return { id: row.id, body: row.body };
}
```

- [ ] **Step 3: Run route**

Create `src/app/api/cover-letter/run/route.ts`:

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
  const quota = await canUse(dbUser.id, "cover_letter");
  if (!quota.allowed) {
    return NextResponse.json({
      success: false,
      error: "quota_exceeded",
      data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: "cover_letter" },
    }, { status: 402 });
  }

  const body = await req.json().catch(() => ({}));
  const jdId = Number(body.jdId);
  const tone = body.tone === "formal" || body.tone === "conversational" || body.tone === "concise" ? body.tone : "conversational";
  if (!Number.isFinite(jdId)) return NextResponse.json({ success: false, error: "jdId required" }, { status: 400 });

  const jd = await db.query.jds.findFirst({ where: and(eq(jds.id, jdId), eq(jds.userId, dbUser.id)) });
  if (!jd) return NextResponse.json({ success: false, error: "JD not found" }, { status: 404 });

  const { runCoverLetter } = await import("@/lib/cover-letter/run");
  try {
    const result = await runCoverLetter({ userId: dbUser.id, jdId: jd.id, jdText: jd.rawText, tone });
    await recordUsage(dbUser.id, "cover_letter", { coverLetterId: result.id });
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    if (err?.message === "no_audit_on_file") {
      return NextResponse.json({ success: false, error: "no_audit_on_file" }, { status: 400 });
    }
    console.error("cover letter failed:", err);
    return NextResponse.json({ success: false, error: "cover_letter_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Item route (GET + PATCH)**

Create `src/app/api/cover-letter/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

async function loadOwned(idStr: string) {
  const id = Number(idStr);
  if (!Number.isFinite(id)) return { error: "Invalid id", status: 400 as const };

  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized", status: 401 as const };

  const { db } = await import("@/db");
  const { users, coverLetters } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return { error: "Unknown user", status: 401 as const };

  const row = await db.query.coverLetters.findFirst({ where: eq(coverLetters.id, id) });
  if (!row) return { error: "Not found", status: 404 as const };
  if (row.userId !== dbUser.id) return { error: "Forbidden", status: 403 as const };

  return { row };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const owned = await loadOwned(id);
  if ("error" in owned) return NextResponse.json({ success: false, error: owned.error }, { status: owned.status });
  return NextResponse.json({ success: true, data: owned.row });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const owned = await loadOwned(id);
  if ("error" in owned) return NextResponse.json({ success: false, error: owned.error }, { status: owned.status });

  const body = await req.json().catch(() => ({}));
  if (typeof body.body !== "string") return NextResponse.json({ success: false, error: "body required" }, { status: 400 });

  const { db } = await import("@/db");
  const { coverLetters } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  await db.update(coverLetters).set({ body: body.body }).where(eq(coverLetters.id, owned.row.id));
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Download route**

Create `src/app/api/cover-letter/[id]/download/route.ts`:

```ts
import { NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";
import { Document, Packer, Paragraph, TextRun } from "docx";

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
  const { users, coverLetters } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const row = await db.query.coverLetters.findFirst({ where: eq(coverLetters.id, id) });
  if (!row) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  if (row.userId !== dbUser.id) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const paragraphs = row.body.split(/\n\n+/).map((p) =>
    new Paragraph({ children: [new TextRun({ text: p.trim(), size: 22 })] })
  );

  const doc = new Document({ sections: [{ children: paragraphs }] });
  const buf = await Packer.toBuffer(doc);

  return new NextResponse(buf as any, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="cover-letter.docx"',
    },
  });
}
```

- [ ] **Step 6: TS + commit**

```bash
npx tsc --noEmit
git add src/lib/gemini-prompts/cover-letter.ts src/lib/cover-letter src/app/api/cover-letter
git commit -m "feat(cover-letter): generate + edit + download .docx"
```

---

### Task 14: Gap analyzer + route

**Files:**
- Create: `src/lib/gemini-prompts/gap.ts`
- Create: `src/lib/gap/run.ts`
- Create: `tests/gap-coverage.test.ts`
- Create: `src/app/api/gap-analyze/run/route.ts`

- [ ] **Step 1: Prompt**

Create `src/lib/gemini-prompts/gap.ts`:

```ts
export const GAP_PROMPT = `You are a resume vs JD gap analyzer.

Given the JD's keywords/requirements and the candidate's skill map, produce concrete edit suggestions for the resume that close the gap WITHOUT inventing experience.

OUTPUT EXACTLY this JSON (no markdown):
{
  "suggestions": [
    {
      "section": "Experience" | "Projects" | "Skills" | "Summary",
      "original": "string or null",
      "suggested": "string",
      "rationale": "one short sentence"
    }
  ]
}

Up to 12 suggestions. Be specific.

JD:
`;
```

- [ ] **Step 2: Coverage failing test**

Create `tests/gap-coverage.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeCoverage } from "@/lib/gap/run";

describe("computeCoverage", () => {
  it("returns matched + missing + score", () => {
    const cov = computeCoverage(
      ["typescript", "react", "kubernetes", "graphql"],
      ["TypeScript", "react", "Postgres"]
    );
    expect(cov.matched.sort()).toEqual(["react", "typescript"]);
    expect(cov.missing.sort()).toEqual(["graphql", "kubernetes"]);
    expect(cov.score).toBe(50);
  });

  it("returns 100 when no JD keywords", () => {
    const cov = computeCoverage([], ["x"]);
    expect(cov.score).toBe(100);
  });
});
```

`npm test -- gap-coverage` — must FAIL.

- [ ] **Step 3: Implement**

Create `src/lib/gap/run.ts`:

```ts
import { db } from "@/db";
import { gapReports, careerAudits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { parseResumeWithGemini } from "@/lib/gemini";
import { GAP_PROMPT } from "@/lib/gemini-prompts/gap";

export interface Coverage {
  matched: string[];
  missing: string[];
  score: number;
}

export interface GapSuggestion {
  section: string;
  original: string | null;
  suggested: string;
  rationale: string;
}

export function computeCoverage(jdKeywords: string[], userSkills: string[]): Coverage {
  if (jdKeywords.length === 0) return { matched: [], missing: [], score: 100 };
  const userLc = new Set(userSkills.map((s) => s.toLowerCase()));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const k of jdKeywords) {
    if (userLc.has(k.toLowerCase())) matched.push(k.toLowerCase());
    else missing.push(k.toLowerCase());
  }
  const score = Math.round((matched.length / jdKeywords.length) * 100);
  return { matched, missing, score };
}

export async function runGap(input: {
  userId: number;
  jdId: number;
  jdText: string;
  jdKeywords: string[];
}): Promise<{ id: number; coverage: Coverage; suggestions: GapSuggestion[] }> {
  const audit = await db.query.careerAudits.findFirst({
    where: eq(careerAudits.userId, input.userId),
    orderBy: [desc(careerAudits.createdAt)],
  });
  if (!audit) throw new Error("no_audit_on_file");

  const userSkills = Object.keys(audit.skillMap || {});
  const coverage = computeCoverage(input.jdKeywords, userSkills);

  const profile = `Skills: ${userSkills.join(", ")}\nReadiness: ${audit.readinessScore ?? 0}%\nMissing keywords: ${coverage.missing.join(", ")}`;
  const raw = await parseResumeWithGemini(`${GAP_PROMPT}\n${input.jdText}\n\nCANDIDATE:\n${profile}`, "");

  let suggestions: GapSuggestion[] = [];
  try {
    const m = raw.match(/```json\s*([\s\S]*?)\s*```/);
    const json = JSON.parse(m ? m[1] : raw);
    if (Array.isArray(json.suggestions)) {
      suggestions = json.suggestions.map((s: any) => ({
        section: String(s.section ?? "Experience"),
        original: s.original ?? null,
        suggested: String(s.suggested ?? ""),
        rationale: String(s.rationale ?? ""),
      }));
    }
  } catch { /* keep empty */ }

  const [row] = await db.insert(gapReports).values({
    userId: input.userId,
    jdId: input.jdId,
    coverage,
    suggestions,
  }).returning();
  return { id: row.id, coverage, suggestions };
}
```

`npm test -- gap-coverage` — must PASS (2).

- [ ] **Step 4: Route**

Create `src/app/api/gap-analyze/run/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import type { HeavyRouteConfig } from "@/lib/runtime-config";

export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

const FREE_SUGGESTION_LIMIT = 3;

export async function POST(req: NextRequest) {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { db } = await import("@/db");
  const { users, jds } = await import("@/db/schema");
  const { eq, and } = await import("drizzle-orm");
  const dbUser = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) });
  if (!dbUser) return NextResponse.json({ success: false, error: "Unknown user" }, { status: 401 });

  const { getUserPlan, canUse, recordUsage } = await import("@/lib/billing/access");
  const plan = await getUserPlan(dbUser.id);

  // Pro: unlimited (charged as rewriter usage). Free: charged as audit usage.
  const quotaKind = plan === "free" ? "audit" : "rewriter";
  const quota = await canUse(dbUser.id, quotaKind as any);
  if (!quota.allowed) {
    return NextResponse.json({
      success: false,
      error: "quota_exceeded",
      data: { planKey: quota.planKey, used: quota.used, limit: quota.limit, kind: quotaKind },
    }, { status: 402 });
  }

  const body = await req.json().catch(() => ({}));
  const jdId = Number(body.jdId);
  if (!Number.isFinite(jdId)) return NextResponse.json({ success: false, error: "jdId required" }, { status: 400 });

  const jd = await db.query.jds.findFirst({ where: and(eq(jds.id, jdId), eq(jds.userId, dbUser.id)) });
  if (!jd) return NextResponse.json({ success: false, error: "JD not found" }, { status: 404 });

  const parsed = (jd.parsed as any) || {};
  const jdKeywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];

  const { runGap } = await import("@/lib/gap/run");
  try {
    const result = await runGap({ userId: dbUser.id, jdId: jd.id, jdText: jd.rawText, jdKeywords });
    await recordUsage(dbUser.id, quotaKind as any, { gapReportId: result.id });

    const truncated = plan === "free" && result.suggestions.length > FREE_SUGGESTION_LIMIT;
    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        coverage: result.coverage,
        suggestions: truncated ? result.suggestions.slice(0, FREE_SUGGESTION_LIMIT) : result.suggestions,
        truncated,
      },
    });
  } catch (err: any) {
    if (err?.message === "no_audit_on_file") {
      return NextResponse.json({ success: false, error: "no_audit_on_file" }, { status: 400 });
    }
    console.error("gap analyze failed:", err);
    return NextResponse.json({ success: false, error: "gap_failed" }, { status: 500 });
  }
}
```

- [ ] **Step 5: TS + commit**

```bash
npx tsc --noEmit
git add src/lib/gemini-prompts/gap.ts src/lib/gap src/app/api/gap-analyze tests/gap-coverage.test.ts
git commit -m "feat(gap): coverage + suggestions, free-tier truncation"
```

---

### Task 15: JdInput component

**Files:**
- Create: `src/components/jd/JdInput.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface JdInputProps {
  onParsed: (jd: { id: number; parsed: any; rawText: string }) => void;
}

export function JdInput({ onParsed }: JdInputProps) {
  const [mode, setMode] = React.useState<"url" | "paste">("url");
  const [url, setUrl] = React.useState("");
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/jd/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "url" ? { url } : { text }),
      });
      const j = await res.json();
      if (!j.success) {
        setErr(j.message || j.error || "Failed to parse JD");
        if (j.error === "host_blocked") setMode("paste");
      } else {
        onParsed(j.data);
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setMode("url")}
          className={`text-xs font-semibold px-3 py-1 rounded-full ${mode === "url" ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-700"}`}
        >URL</button>
        <button
          onClick={() => setMode("paste")}
          className={`text-xs font-semibold px-3 py-1 rounded-full ${mode === "paste" ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-700"}`}
        >Paste text</button>
      </div>

      {mode === "url" ? (
        <Input
          placeholder="https://boards.greenhouse.io/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      ) : (
        <Textarea
          rows={8}
          placeholder="Paste the full job description here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

      <div className="mt-4 flex justify-end">
        <Button onClick={submit} disabled={busy || (mode === "url" ? !url.trim() : text.trim().length < 50)}>
          {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
          Continue
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/components/jd/JdInput.tsx
git commit -m "feat(jd): JdInput component (url + paste)"
```

---

### Task 16: DiffViewer component

**Files:**
- Create: `src/components/rewriter/DiffViewer.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Segment {
  section: string;
  index: number;
  original: string;
  suggested: string;
  accepted: boolean | null;
  rationale?: string;
}

interface DiffViewerProps {
  segments: Segment[];
  onChange: (segments: Segment[]) => void;
}

export function DiffViewer({ segments, onChange }: DiffViewerProps) {
  const setAccepted = (idx: number, accepted: boolean | null) => {
    const next = segments.slice();
    next[idx] = { ...next[idx], accepted };
    onChange(next);
  };

  const grouped = segments.reduce((acc, s, i) => {
    const arr = acc.get(s.section) ?? [];
    arr.push({ s, i });
    acc.set(s.section, arr);
    return acc;
  }, new Map<string, { s: Segment; i: number }[]>());

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([section, items]) => (
        <div key={section}>
          <h3 className="mb-3 text-sm font-semibold text-neutral-950">{section}</h3>
          <ul className="space-y-3">
            {items.map(({ s, i }) => (
              <li key={i} className="rounded-lg border border-neutral-200 bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-500">Original</span>
                    <p className="mt-1 text-neutral-700">{s.original}</p>
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-neutral-500">Suggested</span>
                    <p className={cn("mt-1", s.accepted === false ? "line-through text-neutral-400" : "text-neutral-950 font-medium")}>{s.suggested}</p>
                  </div>
                </div>
                {s.rationale && <p className="mt-2 text-[10px] text-neutral-500 italic">{s.rationale}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setAccepted(i, s.accepted === true ? null : true)}
                    className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border", s.accepted === true ? "bg-neutral-950 text-white border-neutral-950" : "bg-white text-neutral-700 border-neutral-200")}
                  >
                    <Check className="h-3 w-3" /> Accept
                  </button>
                  <button
                    onClick={() => setAccepted(i, s.accepted === false ? null : false)}
                    className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border", s.accepted === false ? "bg-red-600 text-white border-red-600" : "bg-white text-neutral-700 border-neutral-200")}
                  >
                    <X className="h-3 w-3" /> Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/components/rewriter/DiffViewer.tsx
git commit -m "feat(rewriter): DiffViewer component"
```

---

### Task 17: Resume page tab strip

**Files:**
- Create: `src/app/dashboard/resume/_tabs.tsx`
- Modify: `src/app/dashboard/resume/page.tsx`

- [ ] **Step 1: Tab strip**

Create `src/app/dashboard/resume/_tabs.tsx`:

```tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/resume", label: "Audit", exact: true },
  { href: "/dashboard/resume/rewrite", label: "Rewrite" },
  { href: "/dashboard/resume/cover-letter", label: "Cover letter" },
  { href: "/dashboard/resume/gap-analyze", label: "Gap analyze" },
];

export function ResumeTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b border-neutral-200 mb-6">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              active ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-700"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Mount on resume page**

In `src/app/dashboard/resume/page.tsx`, add `import { ResumeTabs } from "./_tabs";` and render `<ResumeTabs />` at the very top of the returned JSX (before any existing content).

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/resume/_tabs.tsx src/app/dashboard/resume/page.tsx
git commit -m "feat(resume): tab strip across resume sub-routes"
```

---

### Task 18: Rewriter pages (intake + diff)

**Files:**
- Create: `src/app/dashboard/resume/rewrite/page.tsx`
- Create: `src/app/dashboard/resume/rewrite/[id]/page.tsx`

- [ ] **Step 1: Intake page**

```tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { JdInput } from "@/components/jd/JdInput";
import { ResumeTabs } from "../_tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

export default function RewritePage() {
  const router = useRouter();
  const [jd, setJd] = React.useState<any>(null);
  const [sourceKind, setSourceKind] = React.useState<"pdf" | "latex">("pdf");
  const [tex, setTex] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState("");

  const run = async () => {
    if (!jd) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/rewriter/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jdId: jd.id, sourceKind, tex: sourceKind === "latex" ? tex : undefined }),
      });
      const j = await res.json();
      if (res.status === 402) {
        setUpgradeReason("Resume rewriter is a Pro feature.");
        setUpgradeOpen(true);
      } else if (!j.success) {
        setErr(j.message || j.error);
      } else {
        router.push(`/dashboard/resume/rewrite/${j.data.versionId}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ResumeTabs />
      <SectionHeader eyebrow="Rewrite" title="Tailor your resume to a JD" description="Pro: unlimited rewrites." />

      {!jd ? (
        <JdInput onParsed={setJd} />
      ) : (
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm font-semibold text-neutral-950">{jd.parsed.title || "Untitled role"}</p>
            <p className="text-xs text-neutral-500">{jd.parsed.company || "—"}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setSourceKind("pdf")} className={`text-xs font-semibold px-3 py-1 rounded-full ${sourceKind === "pdf" ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-700"}`}>PDF resume on file</button>
              <button onClick={() => setSourceKind("latex")} className={`text-xs font-semibold px-3 py-1 rounded-full ${sourceKind === "latex" ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-700"}`}>LaTeX paste</button>
            </div>
            {sourceKind === "latex" && (
              <Textarea rows={8} placeholder="Paste your .tex source here..." value={tex} onChange={(e) => setTex(e.target.value)} />
            )}
            {sourceKind === "pdf" && (
              <p className="text-xs text-neutral-500">We'll use bullets from your most recent audit.</p>
            )}
          </Card>

          {err && <p className="text-xs text-red-600">{err}</p>}

          <div className="flex justify-end">
            <Button onClick={run} disabled={busy || (sourceKind === "latex" && tex.trim().length < 50)}>
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Generate rewrite
            </Button>
          </div>
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} />
    </>
  );
}
```

- [ ] **Step 2: Diff page**

```tsx
"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Loader2, Download } from "lucide-react";
import { ResumeTabs } from "../../_tabs";
import { DiffViewer } from "@/components/rewriter/DiffViewer";
import { SectionHeader } from "@/components/ui/section-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function RewriteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [row, setRow] = React.useState<any>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/rewriter/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j.success) setRow(j.data); });
  }, [id]);

  const onChange = async (segments: any[]) => {
    setRow((r: any) => ({ ...r, diffSegments: segments }));
    setSaving(true);
    try {
      await fetch(`/api/rewriter/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ diffSegments: segments }),
      });
    } finally {
      setSaving(false);
    }
  };

  if (!row) {
    return (
      <>
        <ResumeTabs />
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      </>
    );
  }

  const isLatex = row.sourceKind === "latex";

  return (
    <>
      <ResumeTabs />
      <SectionHeader
        eyebrow="Rewrite"
        title={isLatex ? "LaTeX rewrite" : "Resume rewrite"}
        description={isLatex ? "Modified .tex ready to download." : "Per-bullet diff. Accept or reject."}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={`/api/rewriter/${id}/download?format=${isLatex ? "tex" : "docx"}`}>
                <Download className="mr-1 h-3 w-3" /> Download {isLatex ? ".tex" : ".docx"}
              </a>
            </Button>
            {isLatex && row.modifiedTex && row.modifiedTex.length < 30000 && (
              <Button variant="outline" asChild>
                <a target="_blank" rel="noopener" href={`https://www.overleaf.com/docs?snip_uri=${encodeURIComponent("data:application/x-tex;base64," + Buffer.from(row.modifiedTex).toString("base64"))}`}>
                  Compile in Overleaf
                </a>
              </Button>
            )}
          </div>
        }
      />

      {row.error === "no_recognized_sections" && (
        <Card className="p-4 text-sm text-amber-700 border-amber-200 bg-amber-50">
          We couldn't detect Experience/Projects sections in your .tex — the file is unchanged. Check your section headings or paste the JD bullets manually.
        </Card>
      )}

      {saving && <p className="text-[10px] text-neutral-500 mb-2">Saving...</p>}

      <DiffViewer segments={row.diffSegments || []} onChange={onChange} />
    </>
  );
}
```

Note: this page uses `Buffer.from(...).toString("base64")` in JSX — that's fine since `Buffer` is available in Node-rendered JSX, but **not** in client-side bundles. Wrap it in a `useMemo` that runs on the client only (use `btoa` instead). Replace the Overleaf href line with:

```tsx
href={`https://www.overleaf.com/docs?snip_uri=${encodeURIComponent("data:application/x-tex;base64," + btoa(row.modifiedTex))}`}
```

`btoa` is a browser global; works for ASCII — UTF-8 LaTeX should be safe enough for our allowlist.

- [ ] **Step 3: TS + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/resume/rewrite
git commit -m "feat(rewriter): intake + diff pages"
```

---

### Task 19: Cover letter page

**Files:**
- Create: `src/app/dashboard/resume/cover-letter/page.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { Loader2, Download } from "lucide-react";
import { JdInput } from "@/components/jd/JdInput";
import { ResumeTabs } from "../_tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Textarea } from "@/components/ui/textarea";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

const TONES = [
  { value: "formal", label: "Formal" },
  { value: "conversational", label: "Conversational" },
  { value: "concise", label: "Concise" },
];

export default function CoverLetterPage() {
  const [jd, setJd] = React.useState<any>(null);
  const [tone, setTone] = React.useState("conversational");
  const [busy, setBusy] = React.useState(false);
  const [letter, setLetter] = React.useState<{ id: number; body: string } | null>(null);
  const [draftBody, setDraftBody] = React.useState("");
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState("");

  const generate = async () => {
    if (!jd) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cover-letter/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jdId: jd.id, tone }),
      });
      const j = await res.json();
      if (res.status === 402) {
        setUpgradeReason("Cover letter generator is a Pro feature.");
        setUpgradeOpen(true);
      } else if (j.success) {
        setLetter({ id: j.data.id, body: j.data.body });
        setDraftBody(j.data.body);
      }
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!letter) return;
    await fetch(`/api/cover-letter/${letter.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: draftBody }),
    });
    setSavedAt(Date.now());
  };

  return (
    <>
      <ResumeTabs />
      <SectionHeader eyebrow="Cover letter" title="Generate a tailored cover letter" description="Pro feature." />

      {!jd ? (
        <JdInput onParsed={setJd} />
      ) : !letter ? (
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm font-semibold text-neutral-950">{jd.parsed.title || "Untitled role"}</p>
            <p className="text-xs text-neutral-500">{jd.parsed.company || "—"}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-semibold text-neutral-500 mb-2">Tone</p>
            <div className="flex gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${tone === t.value ? "bg-neutral-950 text-white" : "border border-neutral-200 text-neutral-700"}`}
                >{t.label}</button>
              ))}
            </div>
          </Card>
          <div className="flex justify-end">
            <Button onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Generate
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Textarea rows={18} value={draftBody} onChange={(e) => setDraftBody(e.target.value)} />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-neutral-500">{savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : "Edits not saved"}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={save}>Save</Button>
              <Button asChild>
                <a href={`/api/cover-letter/${letter.id}/download`}>
                  <Download className="mr-1 h-3 w-3" /> Download .docx
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} />
    </>
  );
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/resume/cover-letter
git commit -m "feat(cover-letter): generator page with tone + edit + download"
```

---

### Task 20: Gap analyze page

**Files:**
- Create: `src/app/dashboard/resume/gap-analyze/page.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { JdInput } from "@/components/jd/JdInput";
import { ResumeTabs } from "../_tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { UpgradeModal } from "@/components/billing/UpgradeModal";

export default function GapAnalyzePage() {
  const [jd, setJd] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [report, setReport] = React.useState<any>(null);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const [upgradeReason, setUpgradeReason] = React.useState("");

  const run = async () => {
    if (!jd) return;
    setBusy(true);
    try {
      const res = await fetch("/api/gap-analyze/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jdId: jd.id }),
      });
      const j = await res.json();
      if (res.status === 402) {
        setUpgradeReason(`You've used all ${j.data.limit} ${j.data.kind === "audit" ? "audits" : "rewriter calls"} this month.`);
        setUpgradeOpen(true);
      } else if (j.success) {
        setReport(j.data);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ResumeTabs />
      <SectionHeader eyebrow="Gap analyze" title="Coverage vs. JD" description="Free: 3 suggestions. Pro: full report." />

      {!jd ? (
        <JdInput onParsed={setJd} />
      ) : !report ? (
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm font-semibold text-neutral-950">{jd.parsed.title || "Untitled role"}</p>
            <p className="text-xs text-neutral-500">{jd.parsed.company || "—"}</p>
          </Card>
          <div className="flex justify-end">
            <Button onClick={run} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Run analysis
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-950">Keyword coverage</h3>
              <span className="text-2xl font-semibold text-neutral-950 tabular-nums">{report.coverage.score}%</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
              <div className="h-full bg-neutral-950" style={{ width: `${report.coverage.score}%` }} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
              <div>
                <p className="font-semibold text-neutral-700 mb-1">Matched ({report.coverage.matched.length})</p>
                <p className="text-neutral-600">{report.coverage.matched.join(", ") || "—"}</p>
              </div>
              <div>
                <p className="font-semibold text-neutral-700 mb-1">Missing ({report.coverage.missing.length})</p>
                <p className="text-neutral-600">{report.coverage.missing.join(", ") || "—"}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold text-neutral-950">Suggested edits</h3>
            <ul className="space-y-3">
              {report.suggestions.map((s: any, i: number) => (
                <li key={i} className="rounded-md border border-neutral-200 bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{s.section}</p>
                  {s.original && <p className="mt-1 text-xs text-neutral-500 line-through">{s.original}</p>}
                  <p className="mt-1 text-sm text-neutral-950">{s.suggested}</p>
                  <p className="mt-1 text-[10px] italic text-neutral-500">{s.rationale}</p>
                </li>
              ))}
            </ul>

            {report.truncated && (
              <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-700">
                <Sparkles className="inline h-3 w-3 mr-1" />
                Showing 3 of {report.suggestions.length}+ suggestions. <button onClick={() => { setUpgradeReason("Unlock the full gap report"); setUpgradeOpen(true); }} className="font-semibold underline">Upgrade to Pro</button> for the rest.
              </div>
            )}
          </Card>
        </div>
      )}

      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} reason={upgradeReason} />
    </>
  );
}
```

- [ ] **Step 2: TS + commit**

```bash
npx tsc --noEmit
git add src/app/dashboard/resume/gap-analyze
git commit -m "feat(gap): /dashboard/resume/gap-analyze page"
```

---

### Task 21: Final verification + push

- [ ] **Step 1: Test suite**

```bash
npm test
```

Expected: all suites passing. Phase 4A adds: schema-phase4a, jd-allowlist, jd-fetch, jd-parse, rewriter-diff, rewriter-latex, gap-coverage. ~25 new tests on top of the 84 from Phase 3.

- [ ] **Step 2: TS + lint**

```bash
npx tsc --noEmit
npm run lint
```

Both clean (lint may surface pre-existing warnings).

- [ ] **Step 3: Apply migration**

```bash
set -a && source .env && set +a && npx drizzle-kit push
```

- [ ] **Step 4: Local smoke**

```bash
npm run dev
```

Manual checks (assumes one Pro test user, one free test user):
1. Visit `/dashboard/resume` → see tab strip with 4 tabs.
2. Pro user: paste a Greenhouse JD URL → see parsed JD card. Choose "PDF resume on file" → click Generate → land on `/dashboard/resume/rewrite/[id]` with a per-bullet diff. Toggle Accept/Reject. Click Download .docx → file downloads.
3. Pro user: same JD, "LaTeX paste" → paste a .tex sample → see modified diff + .tex download + Overleaf button (only when modifiedTex < 30 KB).
4. Pro user: cover letter → tone selector → generate → edit → save → download .docx.
5. Free user: gap analyze → see truncated 3 suggestions + upgrade CTA.
6. Free user: try rewriter → 402 → UpgradeModal opens.

- [ ] **Step 5: Push**

```bash
git push -u origin phase-4a-rewriter-cover-gap
```

---

## Self-review

**Spec coverage:**

| Spec section | Tasks |
|---|---|
| §4 architecture | all |
| §5 schema | 1 |
| §6.1 JD pipeline | 2, 3, 4, 5 |
| §6.2 PDF rewriter flow | 8, 9, 10, 11, 12 |
| §6.3 LaTeX rewriter flow | 7, 9, 10, 11, 12 |
| §6.4 cover letter | 13 |
| §6.5 gap analyzer | 14 |
| §6.6 quota integration | 10, 13, 14 |
| §6.7 resume page tabs | 17, 18, 19, 20 |
| §10 rollout | 21 |

Coverage clean.

**Placeholder scan:** No "TBD" / "implement later" / "add error handling". The Task 18 Step 2 note about `btoa` vs `Buffer.from` is a concrete client-vs-server distinction with the correct fix inline.

**Type consistency:** `ParsedJd`, `DiffSegment`, `LatexBullet`, `RewriteOutput`, `Coverage`, `GapSuggestion`, `Tone` all defined and consumed consistently across tasks. Quota kind names (`"rewriter"`, `"cover_letter"`, `"audit"`) match the `UsageKind` type from Phase 3 plans.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-10-phase-4a-rewriter-cover-gap.md`.**
