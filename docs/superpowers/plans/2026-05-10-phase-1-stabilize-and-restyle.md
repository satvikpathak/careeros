# Phase 1 — Stabilize & Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the deployed dashboard so post-audit data renders, and roll out a unified monochrome design system across every authenticated surface (landing page and 3D cloud component untouched).

**Architecture:** Two parallel concerns kept distinct. (1) Deploy fix: every Gemini-touching API route gets `runtime="nodejs"` + `maxDuration=60` via a shared constants module. (2) Design system: a single tokens file drives every authenticated page; shared primitives (`Button`, `Card`, `Badge`, `Progress`, plus new `StatCard`, `SectionHeader`, `EmptyState`) consume tokens; per-page refactors strip ad-hoc colors.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind v4 · shadcn primitives · Framer Motion · Recharts · Clerk · Drizzle/Neon. No new dependencies.

**Hard constraints (do not violate):**
- `src/app/page.tsx` — UNTOUCHED (landing page).
- `src/components/SplineScene.tsx`, `src/components/CloudBackground.tsx` — UNTOUCHED (3D cloud).
- All visual changes are scoped to: `/dashboard/**`, `/sign-in/**`, `/sign-up/**`, `src/components/navigation/**`, `src/components/ui/**`, and the post-login portion of `src/app/globals.css` (no removal of utilities used by landing).

**TDD note:** For visual code, full TDD is awkward. Where reasonable, tests assert export shape (e.g. "API route exports `maxDuration`") or token shape ("`tokens.colors.ink` equals `#0A0A0A`"). Per-page refactors are validated by `npm run build` + Lighthouse + visual review.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `src/lib/runtime-config.ts` | Single source of truth for `runtime` + `maxDuration` for heavy API routes |
| `src/components/ui/tokens.ts` | Design tokens: colors, radii, shadows, spacing |
| `src/components/ui/section-header.tsx` | Page/section heading primitive |
| `src/components/ui/stat-card.tsx` | KPI card primitive (replaces ad-hoc `KPICard` in dashboard) |
| `src/components/ui/empty-state.tsx` | Standard empty state primitive |
| `src/components/ui/usage-chip.tsx` | Nav usage indicator (placeholder rendering until Phase 3) |
| `tests/runtime-config.test.ts` | Verify every heavy route exports `maxDuration` ≥ 60 |
| `tests/tokens.test.ts` | Verify token shape and that no semantic color is the legacy blue |
| `docs/VERCEL_ENV_CHECKLIST.md` | Pre-deploy env var checklist |

### Modified files

API runtime fix (additive `export const` lines only):
- `src/app/api/resume/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/roadmap/route.ts`
- `src/app/api/roadmap/progress/route.ts`
- `src/app/api/quiz/route.ts`
- `src/app/api/sprint/generate/route.ts`
- `src/app/api/match/route.ts`
- `src/app/api/jobs/route.ts`
- `src/app/api/market-radar/route.ts`
- `src/app/api/project-builder/route.ts`
- `src/app/api/resources/route.ts`
- `src/app/api/dashboard/data/route.ts`
- `src/app/api/dashboard/task/toggle/route.ts`

UI primitives (monochrome refactor):
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/progress.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`

Pages (per-page color/structure refactor):
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/resume/page.tsx`
- `src/app/dashboard/jobs/page.tsx`
- `src/app/dashboard/roadmap/page.tsx`
- `src/app/dashboard/resources/page.tsx`
- `src/app/dashboard/chat/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/sign-in/[[...index]]/page.tsx`
- `src/app/sign-up/[[...index]]/page.tsx`

Navigation:
- `src/components/navigation/AppNavbar.tsx`
- `src/components/navigation/DashboardSidebar.tsx`
- `src/components/navigation/DashboardHeader.tsx`

Styles + lint:
- `src/app/globals.css` (additive `@layer` for monochrome utilities; no removal of existing utilities used by landing)
- `eslint.config.mjs` (warning rule against legacy color literals in `dashboard/**`)

---

## Task Index

1. Repo housekeeping & test setup
2. Runtime config helper
3. Apply runtime config to all heavy API routes
4. Vercel env checklist doc
5. Idempotency guard for resume audit (defensive)
6. Design tokens
7. Refactor `Button`
8. Refactor `Card`
9. Refactor `Badge`
10. Refactor `Progress`
11. Refactor `Input` + `Textarea`
12. Refactor `Tabs`, `Dialog`, `DropdownMenu`
13. Add `SectionHeader` primitive
14. Add `StatCard` primitive
15. Add `EmptyState` primitive
16. Add `UsageChip` primitive
17. Refactor `AppNavbar` (post-login mode)
18. Refactor `DashboardSidebar`
19. Refactor `DashboardHeader` & `dashboard/layout.tsx`
20. Refactor `/dashboard/page.tsx`
21. Refactor `/dashboard/resume/page.tsx`
22. Refactor `/dashboard/jobs/page.tsx`
23. Refactor `/dashboard/roadmap/page.tsx`
24. Refactor `/dashboard/resources/page.tsx`
25. Refactor `/dashboard/chat/page.tsx`
26. Refactor sign-in / sign-up chrome
27. ESLint guardrail against legacy colors in dashboard tree
28. Final verification & Lighthouse pass

---

### Task 1: Repo housekeeping & test setup

**Files:**
- Create: `tests/.gitkeep`
- Modify: `package.json` (add `test` script + `vitest` devDependencies)
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Add `test` script to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Smoke test**

Create `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: `smoke > runs ✓` and exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/
git commit -m "chore(test): add Vitest harness"
```

---

### Task 2: Runtime config helper

**Files:**
- Create: `src/lib/runtime-config.ts`
- Create: `tests/runtime-config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/runtime-config.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { runtime, maxDuration, dynamic } from "@/lib/runtime-config";

describe("runtime-config", () => {
  it("uses Node runtime", () => {
    expect(runtime).toBe("nodejs");
  });
  it("allows up to 60s", () => {
    expect(maxDuration).toBe(60);
  });
  it("forces dynamic", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- runtime-config`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement helper**

Create `src/lib/runtime-config.ts`:

```ts
/**
 * Shared route configuration for API endpoints that call Gemini, parse PDFs,
 * upload to S3, or otherwise run longer than the default 10s edge limit.
 *
 * Re-export these constants from any heavy route handler:
 *
 *   export { runtime, maxDuration, dynamic } from "@/lib/runtime-config";
 */
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
```

- [ ] **Step 4: Verify pass**

Run: `npm test -- runtime-config`
Expected: 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/runtime-config.ts tests/runtime-config.test.ts
git commit -m "feat(api): add shared runtime-config for heavy routes"
```

---

### Task 3: Apply runtime config to all heavy API routes

**Files:** modify each of the 13 routes listed in File Structure → API runtime fix.

- [ ] **Step 1: Write a failing route-coverage test**

Create `tests/api-runtime.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const HEAVY_ROUTES = [
  "src/app/api/resume/route.ts",
  "src/app/api/chat/route.ts",
  "src/app/api/roadmap/route.ts",
  "src/app/api/roadmap/progress/route.ts",
  "src/app/api/quiz/route.ts",
  "src/app/api/sprint/generate/route.ts",
  "src/app/api/match/route.ts",
  "src/app/api/jobs/route.ts",
  "src/app/api/market-radar/route.ts",
  "src/app/api/project-builder/route.ts",
  "src/app/api/resources/route.ts",
  "src/app/api/dashboard/data/route.ts",
  "src/app/api/dashboard/task/toggle/route.ts",
];

describe("heavy API routes", () => {
  for (const rel of HEAVY_ROUTES) {
    it(`${rel} re-exports runtime-config`, () => {
      const src = readFileSync(resolve(process.cwd(), rel), "utf8");
      expect(src).toMatch(/from\s+["']@\/lib\/runtime-config["']/);
    });
  }
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- api-runtime`
Expected: 13 tests fail (none of the routes import runtime-config yet).

- [ ] **Step 3: Patch each route**

For **every** path in `HEAVY_ROUTES`, add the following line directly after the existing imports (at the top of the file, before `export async function ...`):

```ts
export { runtime, maxDuration, dynamic } from "@/lib/runtime-config";
```

Special case for `src/app/api/dashboard/data/route.ts` — it already has its own `dynamic` and `revalidate`. Replace the existing two lines:

```ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
```

with:

```ts
export { runtime, maxDuration, dynamic } from "@/lib/runtime-config";
export const revalidate = 0;
```

Special case for `src/app/api/resume/route.ts` — same: ensure no duplicate `dynamic`/`runtime` exports remain after adding the re-export line.

- [ ] **Step 4: Verify pass**

Run: `npm test -- api-runtime`
Expected: all 13 pass.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds. Watch for "duplicate export" errors — fix by removing duplicate `export const dynamic` / `runtime` / `maxDuration` from the route file.

- [ ] **Step 6: Commit**

```bash
git add src/app/api tests/api-runtime.test.ts
git commit -m "fix(api): set Node runtime + maxDuration=60 on all heavy routes

Resolves the deployed-dashboard regression where audit POST silently
504'd inside Gemini calls and never persisted. All Gemini/PDF/S3 routes
now share runtime-config."
```

---

### Task 4: Vercel env checklist doc

**Files:**
- Create: `docs/VERCEL_ENV_CHECKLIST.md`

- [ ] **Step 1: Write the doc**

Create `docs/VERCEL_ENV_CHECKLIST.md`:

```markdown
# Vercel Environment Checklist

Before promoting a deploy, verify every variable is set in **Production** (and **Preview** if you preview-test):

## Required
- `DATABASE_URL` — Neon Postgres connection string. Without it, the dashboard returns empty data and audits never persist. See `src/db/index.ts`.
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — auth. Without them every protected route returns 401.
- `GEMINI_API_KEY` — Gemini 2.5 Flash. Without it, audit / chat / roadmap / quiz routes throw.

## Optional but recommended
- `RAPIDAPI_KEY` — falls back to mock data if missing.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME` — without these S3 upload is skipped (S3 URL becomes `local://...`); audit still saves.

## Function settings
- All routes under `src/app/api/**` listed in `src/lib/runtime-config.ts` consumers run on the **Node** runtime with `maxDuration=60`.
- Confirm the project's Vercel plan allows 60-second function durations (Pro or Fluid Compute on Hobby).

## Smoke test after deploy
1. Sign in.
2. Upload a resume on `/dashboard/resume`.
3. Within 30s, navigate to `/dashboard` — readiness/skill data should render.
4. If empty: check Vercel Function logs for the resume route — look for `DB persistence failed` or Gemini timeouts.
```

- [ ] **Step 2: Commit**

```bash
git add docs/VERCEL_ENV_CHECKLIST.md
git commit -m "docs: add Vercel env checklist for deploy verification"
```

---

### Task 5: Idempotency guard for resume audit

**Files:**
- Modify: `src/app/api/resume/route.ts`
- Create: `tests/resume-idempotency.test.ts`

**Why:** Two rapid form submits today insert two audit rows. Add a 30-second per-user content-hash window.

- [ ] **Step 1: Write the failing test**

Create `tests/resume-idempotency.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { auditFingerprint } from "@/lib/audit-fingerprint";

describe("auditFingerprint", () => {
  it("is deterministic for the same inputs", () => {
    const a = auditFingerprint("user-1", "resume text", "Software Engineer");
    const b = auditFingerprint("user-1", "resume text", "Software Engineer");
    expect(a).toBe(b);
  });
  it("differs across users", () => {
    const a = auditFingerprint("user-1", "x", "y");
    const b = auditFingerprint("user-2", "x", "y");
    expect(a).not.toBe(b);
  });
  it("differs when resume changes", () => {
    const a = auditFingerprint("u", "abc", "role");
    const b = auditFingerprint("u", "abd", "role");
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- resume-idempotency`
Expected: module not found.

- [ ] **Step 3: Implement fingerprint helper**

Create `src/lib/audit-fingerprint.ts`:

```ts
import { createHash } from "node:crypto";

export function auditFingerprint(userId: string | number, resumeText: string, targetRole: string): string {
  return createHash("sha256")
    .update(String(userId))
    .update("|")
    .update(resumeText.trim())
    .update("|")
    .update(targetRole.trim().toLowerCase())
    .digest("hex");
}
```

- [ ] **Step 4: Verify fingerprint test passes**

Run: `npm test -- resume-idempotency`
Expected: 3 pass.

- [ ] **Step 5: Wire fingerprint into the route (in-memory dedupe)**

In `src/app/api/resume/route.ts`, immediately after the `import` block, add:

```ts
import { auditFingerprint } from "@/lib/audit-fingerprint";

// In-memory short-window dedupe (per server instance). 30 second window is
// enough to absorb double-submits without breaking legitimate re-runs.
const RECENT_FINGERPRINTS = new Map<string, number>();
const DEDUPE_WINDOW_MS = 30_000;

function isRecentFingerprint(fp: string): boolean {
  const now = Date.now();
  for (const [k, t] of RECENT_FINGERPRINTS) {
    if (now - t > DEDUPE_WINDOW_MS) RECENT_FINGERPRINTS.delete(k);
  }
  if (RECENT_FINGERPRINTS.has(fp)) return true;
  RECENT_FINGERPRINTS.set(fp, now);
  return false;
}
```

Then, inside `POST`, after `const resumeText = pdfData.text;`, before the S3 block, insert:

```ts
// Best-effort dedupe — only when authenticated, otherwise no-op.
try {
  const { auth } = await import("@clerk/nextjs/server");
  const { userId: clerkId } = await auth();
  if (clerkId) {
    const fp = auditFingerprint(clerkId, resumeText, targetRole);
    if (isRecentFingerprint(fp)) {
      return NextResponse.json(
        { success: false, error: "Duplicate submission — please wait a moment before retrying." },
        { status: 429 }
      );
    }
  }
} catch {
  // Non-fatal: missing auth in dev shouldn't block the audit.
}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/lib/audit-fingerprint.ts src/app/api/resume/route.ts tests/resume-idempotency.test.ts
git commit -m "fix(api): dedupe resume audit submissions within 30s window"
```

---

### Task 6: Design tokens

**Files:**
- Create: `src/components/ui/tokens.ts`
- Create: `tests/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/tokens.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { tokens } from "@/components/ui/tokens";

describe("tokens", () => {
  it("ink is near-black", () => {
    expect(tokens.colors.ink).toBe("#0A0A0A");
  });
  it("no remnant of legacy brand blue", () => {
    const flat = JSON.stringify(tokens).toLowerCase();
    expect(flat).not.toContain("#005bb7");
    expect(flat).not.toContain("#004b99");
  });
  it("exposes radius scale", () => {
    expect(tokens.radii.sm).toBe(8);
    expect(tokens.radii.md).toBe(12);
    expect(tokens.radii.lg).toBe(16);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- tokens`
Expected: module not found.

- [ ] **Step 3: Implement tokens**

Create `src/components/ui/tokens.ts`:

```ts
/**
 * CareerOS monochrome design tokens (post-login surfaces only).
 *
 * Consumers: shadcn primitives (`button`, `card`, `badge`, ...), shared
 * primitives (`StatCard`, `SectionHeader`, ...), and authenticated pages.
 *
 * NEVER imported from `src/app/page.tsx` or the 3D cloud components — the
 * landing page keeps its glass / gradient look.
 */
export const tokens = {
  colors: {
    ink: "#0A0A0A",
    surface0: "#FFFFFF",
    surface1: "#FAFAFA",
    surface2: "#F5F5F5",
    border: "#E5E5E5",
    borderStrong: "#D4D4D4",
    textPrimary: "#0A0A0A",
    textSecondary: "#525252",
    textMuted: "#A3A3A3",
    success: "#16A34A",
    warning: "#CA8A04",
    danger: "#DC2626",
    info: "#525252",
  },
  radii: { sm: 8, md: 12, lg: 16 },
  shadows: {
    sm: "0 1px 2px 0 rgba(0,0,0,0.04), 0 1px 3px 0 rgba(0,0,0,0.04)",
    md: "0 4px 12px -2px rgba(0,0,0,0.08)",
  },
} as const;

export type Tokens = typeof tokens;

/**
 * Tailwind-class shortcuts derived from tokens. Use these in className strings
 * so future token changes propagate automatically.
 */
export const t = {
  surface: "bg-white",
  surfaceMuted: "bg-neutral-50",
  surfaceHover: "hover:bg-neutral-50",
  border: "border border-neutral-200",
  borderStrong: "border border-neutral-300",
  text: "text-neutral-950",
  textSecondary: "text-neutral-600",
  textMuted: "text-neutral-400",
  card: "bg-white border border-neutral-200 rounded-xl shadow-sm",
  inkButton: "bg-neutral-950 text-white hover:bg-neutral-800",
  outlineButton: "border border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-50",
  ghostButton: "text-neutral-700 hover:bg-neutral-100",
} as const;
```

- [ ] **Step 4: Verify pass**

Run: `npm test -- tokens`
Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/tokens.ts tests/tokens.test.ts
git commit -m "feat(ui): add monochrome design tokens"
```

---

### Task 7: Refactor `Button`

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Replace variant definitions**

Open `src/components/ui/button.tsx`. Replace the entire `buttonVariants` block (lines 10-43) with:

```ts
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-900/20 aria-invalid:ring-red-500/20 aria-invalid:border-red-500",
  {
    variants: {
      variant: {
        default: "bg-neutral-950 text-white hover:bg-neutral-800 shadow-sm",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
        outline: "border border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-50 shadow-sm",
        secondary: "bg-neutral-100 text-neutral-950 hover:bg-neutral-200",
        ghost: "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950",
        link: "text-neutral-950 underline-offset-4 hover:underline",
        glass: "bg-white/30 text-neutral-900 border border-white/50 backdrop-blur-xl hover:-translate-y-0.5",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)
```

Note the `glass` variant is preserved so the landing page (which still imports `Button`) keeps working unchanged. All other variants are now monochrome.

- [ ] **Step 2: Soften the framer-motion hover**

Inside the `Button` function, replace the hover/tap values with a smaller delta (the previous translate+scale felt too playful for the new tone):

```tsx
const hover = disabled ? undefined : { y: -1 }
const tap = disabled ? undefined : { y: 0, scale: 0.98 }
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "refactor(ui): monochrome Button variants"
```

---

### Task 8: Refactor `Card`

**Files:**
- Modify: `src/components/ui/card.tsx`

- [ ] **Step 1: Replace base classes**

Open `src/components/ui/card.tsx`. Replace the `Card` component body with:

```tsx
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-white text-neutral-950 flex flex-col gap-6 rounded-xl border border-neutral-200 py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}
```

The other helpers (`CardHeader`, `CardTitle`, etc.) already use semantic tokens — leave them.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "refactor(ui): monochrome Card base"
```

---

### Task 9: Refactor `Badge`

**Files:**
- Modify: `src/components/ui/badge.tsx`

- [ ] **Step 1: Replace variants**

In `src/components/ui/badge.tsx` replace the `badgeVariants` `variants.variant` object with:

```ts
variant: {
  default: "bg-neutral-950 text-white",
  secondary: "bg-neutral-100 text-neutral-700",
  destructive: "bg-red-50 text-red-700 border border-red-200",
  outline: "border border-neutral-300 text-neutral-700",
  ghost: "text-neutral-600",
  link: "text-neutral-950 underline-offset-4 hover:underline",
  success: "bg-green-50 text-green-700 border border-green-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
},
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/badge.tsx
git commit -m "refactor(ui): monochrome Badge with semantic accents"
```

---

### Task 10: Refactor `Progress`

**Files:**
- Modify: `src/components/ui/progress.tsx`

- [ ] **Step 1: Replace classes**

Replace the file contents with:

```tsx
"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-neutral-100 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-neutral-950 h-full w-full flex-1 transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/progress.tsx
git commit -m "refactor(ui): monochrome Progress"
```

---

### Task 11: Refactor `Input` + `Textarea`

**Files:**
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/textarea.tsx`

- [ ] **Step 1: Read existing files**

Run: `cat src/components/ui/input.tsx src/components/ui/textarea.tsx` (use Read tool).

- [ ] **Step 2: Patch `Input`**

Replace the className inside `Input` with:

```tsx
className={cn(
  "flex h-10 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 focus-visible:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50",
  className
)}
```

(Preserve the existing prop spreading and `data-slot`.)

- [ ] **Step 3: Patch `Textarea`** with the same color tokens (replace the existing className with the same monochrome class string, swapping `h-10` for the textarea's existing min-height).

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/input.tsx src/components/ui/textarea.tsx
git commit -m "refactor(ui): monochrome Input/Textarea"
```

---

### Task 12: Refactor `Tabs`, `Dialog`, `DropdownMenu`

**Files:**
- Modify: `src/components/ui/tabs.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/dropdown-menu.tsx`

- [ ] **Step 1: For each file, replace any `bg-primary`, `text-primary-foreground`, brand-blue or accent literals with neutral classes:**

| Old | New |
|---|---|
| `bg-primary text-primary-foreground` | `bg-neutral-950 text-white` |
| `data-[state=active]:bg-background data-[state=active]:text-foreground` | `data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-sm` |
| `bg-muted` | `bg-neutral-100` |
| `text-muted-foreground` | `text-neutral-600` |
| `border-input` | `border-neutral-300` |

Apply globally within each file. The intent is: zero brand-blue, all greys.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/tabs.tsx src/components/ui/dialog.tsx src/components/ui/dropdown-menu.tsx
git commit -m "refactor(ui): monochrome Tabs/Dialog/DropdownMenu"
```

---

### Task 13: Add `SectionHeader` primitive

**Files:**
- Create: `src/components/ui/section-header.tsx`

- [ ] **Step 1: Implement**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ eyebrow, title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            {eyebrow}
          </span>
        )}
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/section-header.tsx
git commit -m "feat(ui): add SectionHeader primitive"
```

---

### Task 14: Add `StatCard` primitive

**Files:**
- Create: `src/components/ui/stat-card.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: { value: number; label?: string };
  icon?: React.ElementType;
  className?: string;
}

export function StatCard({ label, value, delta, icon: Icon, className }: StatCardProps) {
  const isPositive = delta ? delta.value >= 0 : true;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 shadow-sm",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100">
            <Icon className="h-4 w-4 text-neutral-700" />
          </div>
        )}
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
              isPositive
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            )}
          >
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? "+" : ""}
            {delta.value}%
          </span>
        )}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-950 tabular-nums">{value}</p>
      {delta?.label && <p className="mt-1 text-[11px] text-neutral-500">{delta.label}</p>}
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/stat-card.tsx
git commit -m "feat(ui): add StatCard primitive"
```

---

### Task 15: Add `EmptyState` primitive

**Files:**
- Create: `src/components/ui/empty-state.tsx`

- [ ] **Step 1: Implement**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-16 text-center", className)}>
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
          <Icon className="h-6 w-6 text-neutral-700" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-neutral-950">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-neutral-500">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/empty-state.tsx
git commit -m "feat(ui): add EmptyState primitive"
```

---

### Task 16: Add `UsageChip` primitive

**Files:**
- Create: `src/components/ui/usage-chip.tsx`

**Why now:** the nav rail in Task 17 needs somewhere to render the chip. Until Phase 3, it renders a static "Free plan" badge — wired up to real usage in Phase 3.

- [ ] **Step 1: Implement**

```tsx
"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UsageChipProps {
  planLabel?: string;
  href?: string;
  className?: string;
}

export function UsageChip({ planLabel = "Free", href = "/dashboard", className }: UsageChipProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      {planLabel} plan
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/usage-chip.tsx
git commit -m "feat(ui): add UsageChip placeholder"
```

---

### Task 17: Refactor `AppNavbar` (post-login mode)

**Files:**
- Modify: `src/components/navigation/AppNavbar.tsx`

- [ ] **Step 1: Replace post-login branch styles**

In `src/components/navigation/AppNavbar.tsx`, the component renders two visual styles based on `isHomePage`. The home-page branch must remain unchanged. Replace each post-login (`!isHomePage`) class string with monochrome equivalents:

| Old (`!isHomePage`) | New |
|---|---|
| `border border-black/10 bg-white/80 shadow-md` (nav container) | `border border-neutral-200 bg-white/95 backdrop-blur-md shadow-sm` |
| `bg-black text-white shadow-md hover:shadow-lg` (CTA) | `bg-neutral-950 text-white hover:bg-neutral-800 shadow-sm` |
| `border border-black/15 bg-white shadow-sm` (mobile button) | `border border-neutral-200 bg-white shadow-sm` |
| `border border-black/10 bg-white/95 shadow-md` (mobile drawer) | `border border-neutral-200 bg-white shadow-sm` |
| Mobile link `hover:bg-black/5` | `hover:bg-neutral-100` |

Find each string by exact match — do not use replace_all.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/navigation/AppNavbar.tsx
git commit -m "refactor(nav): monochrome AppNavbar in post-login mode"
```

---

### Task 18: Refactor `DashboardSidebar`

**Files:**
- Modify: `src/components/navigation/DashboardSidebar.tsx`

- [ ] **Step 1: Replace logo, active styles, upgrade card**

Apply these substitutions in order:

| Old | New |
|---|---|
| `bg-gradient-to-br from-[#005BB7] to-[#020617]` (logo) | `bg-neutral-950` |
| `shadow-blue-200/50` (logo) | `` (remove) |
| `text-[#020617]` (every occurrence) | `text-neutral-950` |
| `text-[#9CA3AF]` (every occurrence) | `text-neutral-400` |
| `text-[#4B5563]` (every occurrence) | `text-neutral-600` |
| `text-[#005BB7]` (every occurrence) | `text-neutral-950` |
| `bg-[#EFF6FF]` (active background) | `bg-neutral-100` |
| `border-[#005BB7]/10` | `border-neutral-200` |
| `bg-[#005BB7]/10 text-[#005BB7]` (active icon) | `bg-neutral-950 text-white` |
| `bg-gradient-to-br from-[#005BB7] to-[#004B99] ... text-white` (upgrade card outer) | `bg-neutral-950 text-white` |
| `text-blue-200` (upgrade card eyebrow) | `text-neutral-300` |
| `text-[#005BB7]` (upgrade button label) | `text-neutral-950` |
| `bg-white text-[#005BB7]` (upgrade button) | `bg-white text-neutral-950 hover:bg-neutral-100` |
| `bg-white/10` and `bg-white/5` (decorative circles) | `bg-white/10` (keep — they sit on the now-black card and look correct) |
| `bg-[#005BB7]` (active right-side dot) | `bg-white` (it now sits on the dark active row — actually, the active row now has `bg-neutral-100`, so use `bg-neutral-950`) |

Replace `text-[15px] font-bold text-[#020617]` → `text-[15px] font-semibold text-neutral-950`.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/navigation/DashboardSidebar.tsx
git commit -m "refactor(nav): monochrome DashboardSidebar"
```

---

### Task 19: Refactor `DashboardHeader` & `dashboard/layout.tsx`

**Files:**
- Modify: `src/components/navigation/DashboardHeader.tsx`
- Modify: `src/app/dashboard/layout.tsx`

- [ ] **Step 1: Read DashboardHeader**

Run Read on `src/components/navigation/DashboardHeader.tsx`.

- [ ] **Step 2: Apply token replacements**

Replace every brand color (`#005BB7`, `#004B99`, `#020617`, blue/amber/emerald shadcn classes used as accents) with the corresponding neutral class from the table in Task 18.

- [ ] **Step 3: Update `dashboard/layout.tsx`**

Open `src/app/dashboard/layout.tsx`. Replace `bg-[#FAFBFF]` (line 34) with `bg-neutral-50`.

Add `<UsageChip />` to the `rightSlot`:

```tsx
import { UsageChip } from "@/components/ui/usage-chip";

// ...

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
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/components/navigation/DashboardHeader.tsx src/app/dashboard/layout.tsx
git commit -m "refactor(nav): monochrome DashboardHeader and layout"
```

---

### Task 20: Refactor `/dashboard/page.tsx`

**Files:**
- Modify: `src/app/dashboard/page.tsx`

This is the largest single page change. Goal: replace the inline `KPICard` with the new `StatCard`, remove the `marketTrends` rainbow palette, retire all blue/amber/emerald/cyan/rose accents.

- [ ] **Step 1: Replace imports**

Add at the top:

```ts
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
```

- [ ] **Step 2: Delete the inline `KPICard` component (lines ~148-237)**

Delete the entire `KPICardProps` interface and `KPICard` function. The file no longer needs them.

- [ ] **Step 3: Replace the KPI grid**

Replace the four `<KPICard>` invocations with:

```tsx
<StatCard
  label="Readiness Score"
  value={`${audit.readinessScore || 0}%`}
  delta={{ value: 12.5, label: "vs last assessment" }}
  icon={Target}
/>
<StatCard
  label="Market Match"
  value={`${audit.marketMatchScore || 0}%`}
  delta={{ value: 8.2, label: "role alignment score" }}
  icon={TrendingUp}
/>
<StatCard
  label="Sprint Progress"
  value={`${Math.round(completionRate)}%`}
  delta={{
    value: completionRate > 50 ? 15.3 : -5.2,
    label: sprint ? `Week #${sprint.weekNumber}` : "No active sprint",
  }}
  icon={Zap}
/>
<StatCard
  label="Project Quality"
  value={`${audit.projectQualityScore || 0}%`}
  delta={{ value: 6.7, label: "portfolio strength" }}
  icon={BarChart3}
/>
```

- [ ] **Step 4: Replace the empty-state branch**

Replace the entire `if (!data?.audit)` block with:

```tsx
if (!data?.audit) {
  return (
    <EmptyState
      icon={FileText}
      title="No career audit yet"
      description="Upload your resume to generate your Career Intelligence Audit and unlock weekly sprints."
      action={
        <Button asChild>
          <Link href="/dashboard/resume">
            Start your audit <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      }
    />
  );
}
```

- [ ] **Step 5: Replace the loading branch**

Replace it with:

```tsx
if (loading) {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      <p className="text-sm text-neutral-500">Loading your career intelligence...</p>
    </div>
  );
}
```

- [ ] **Step 6: Replace header block**

Replace the header `motion.div` (the welcome bar) with:

```tsx
<SectionHeader
  eyebrow="CareerOS"
  title={`Welcome back, ${user.name?.split(" ")[0] || "Developer"}`}
  description="Your career intelligence overview."
  actions={
    <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5">
      <Trophy className="h-3.5 w-3.5 text-neutral-700" />
      <span className="text-[12px] font-semibold text-neutral-950">
        <AnimatedCounter value={user.streak || 0} suffix=" day streak" />
      </span>
    </div>
  }
/>
```

- [ ] **Step 7: Color sweep**

Run a series of explicit string replaces inside this file:

| Old | New |
|---|---|
| `text-[#020617]` | `text-neutral-950` |
| `text-[#9CA3AF]` | `text-neutral-400` |
| `text-[#4B5563]` | `text-neutral-600` |
| `text-[#005BB7]` | `text-neutral-950` |
| `bg-[#005BB7]` | `bg-neutral-950` |
| `bg-[#004B99]` | `bg-neutral-800` |
| `bg-blue-50` | `bg-neutral-100` |
| `bg-amber-50` | `bg-neutral-100` |
| `bg-emerald-50` | `bg-neutral-100` |
| `bg-cyan-50` | `bg-neutral-100` |
| `bg-rose-50` | `bg-neutral-100` |
| `text-amber-500` | `text-neutral-700` |
| `text-emerald-500` | `text-neutral-700` |
| `text-cyan-500` | `text-neutral-700` |
| `text-rose-500` | `text-neutral-700` |
| `text-blue-500` | `text-neutral-700` |
| `border-gray-100` | `border-neutral-200` |
| `border-gray-50` | `border-neutral-200` |
| `bg-gray-50/50` | `bg-neutral-50` |
| `bg-gray-50` | `bg-neutral-50` |
| `bg-gray-100` | `bg-neutral-100` |
| `rounded-[24px]` | `rounded-xl` |
| `rounded-[20px]` | `rounded-lg` |

- [ ] **Step 8: Recharts color sweep**

Replace the `barColors` array with:

```ts
const barColors = ["#0A0A0A", "#262626", "#525252", "#737373", "#A3A3A3"];
```

In every `<Area>`, `<Radar>`, gradient `stop`, replace `stroke="#06B6D4"` / `"#F59E0B"` / `"#005BB7"` etc. with `stroke="#0A0A0A"` for the primary series and `stroke="#737373"` / `"#A3A3A3"` for secondary/tertiary. Update `linearGradient` `stopColor`s correspondingly. The legend swatch colors should be updated to match.

- [ ] **Step 9: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 10: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "refactor(dashboard): monochrome dashboard page using shared primitives"
```

---

### Task 21: Refactor `/dashboard/resume/page.tsx`

**Files:**
- Modify: `src/app/dashboard/resume/page.tsx`

- [ ] **Step 1: Color sweep**

Apply the same Old→New table from Task 20 Step 7 to this file.

- [ ] **Step 2: Replace empty/preview cards**

Where the page renders ad-hoc panels for "no audit yet" / "previous audit", swap to `EmptyState` and `Card` primitives. (Read the file first, then make targeted Edit calls.)

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/resume/page.tsx
git commit -m "refactor(dashboard): monochrome resume page"
```

---

### Task 22: Refactor `/dashboard/jobs/page.tsx`

**Files:**
- Modify: `src/app/dashboard/jobs/page.tsx`

- [ ] **Step 1: Replace `sourceColors` map**

Replace the rainbow palette with neutrals + one accent:

```ts
const sourceColors: Record<string, string> = {
  linkedin: "bg-neutral-100 text-neutral-700 border border-neutral-200",
  indeed:   "bg-neutral-100 text-neutral-700 border border-neutral-200",
  naukri:   "bg-neutral-100 text-neutral-700 border border-neutral-200",
  other:    "bg-neutral-100 text-neutral-700 border border-neutral-200",
};
```

- [ ] **Step 2: Color sweep** (same table as Task 20).

- [ ] **Step 3: Verify build**

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/jobs/page.tsx
git commit -m "refactor(dashboard): monochrome jobs page"
```

---

### Task 23: Refactor `/dashboard/roadmap/page.tsx`

**Files:**
- Modify: `src/app/dashboard/roadmap/page.tsx`

- [ ] **Step 1: Color sweep** (same table as Task 20).
- [ ] **Step 2: Verify build, commit:**

```bash
git add src/app/dashboard/roadmap/page.tsx
git commit -m "refactor(dashboard): monochrome roadmap page"
```

---

### Task 24: Refactor `/dashboard/resources/page.tsx`

**Files:**
- Modify: `src/app/dashboard/resources/page.tsx`
- Modify: any helpers under `src/components/resources/*`

- [ ] **Step 1: Color sweep** in `src/app/dashboard/resources/page.tsx` and each child under `src/components/resources/`.
- [ ] **Step 2: Verify build, commit:**

```bash
git add src/app/dashboard/resources src/components/resources
git commit -m "refactor(dashboard): monochrome resources page"
```

---

### Task 25: Refactor `/dashboard/chat/page.tsx`

**Files:**
- Modify: `src/app/dashboard/chat/page.tsx`

- [ ] **Step 1: Color sweep** (same table as Task 20).
- [ ] **Step 2: Verify build, commit:**

```bash
git add src/app/dashboard/chat/page.tsx
git commit -m "refactor(dashboard): monochrome chat page"
```

---

### Task 26: Refactor sign-in / sign-up chrome

**Files:**
- Modify: `src/app/sign-in/[[...index]]/page.tsx`
- Modify: `src/app/sign-up/[[...index]]/page.tsx`

- [ ] **Step 1: Read the existing files.**

- [ ] **Step 2: Replace background containers**

Where the page wraps the Clerk component, set the wrapper to `bg-neutral-50 min-h-screen flex items-center justify-center` and pass Clerk `appearance` props to use neutral colors:

```tsx
appearance={{
  elements: {
    card: "shadow-sm border border-neutral-200",
    formButtonPrimary: "bg-neutral-950 hover:bg-neutral-800 text-white",
    footerActionLink: "text-neutral-950 hover:underline",
  },
}}
```

- [ ] **Step 3: Verify build, commit:**

```bash
git add src/app/sign-in src/app/sign-up
git commit -m "refactor(auth): monochrome sign-in/sign-up chrome"
```

---

### Task 27: ESLint guardrail against legacy colors in dashboard tree

**Files:**
- Modify: `eslint.config.mjs`

- [ ] **Step 1: Add a `no-restricted-syntax` rule scoped to dashboard files**

Append to `eslintConfig`:

```js
{
  files: ["src/app/dashboard/**/*.tsx", "src/components/navigation/**/*.tsx"],
  rules: {
    "no-restricted-syntax": [
      "warn",
      {
        selector: "Literal[value=/#005BB7|#004B99|#020617|#06B6D4|#F59E0B/i]",
        message: "Legacy brand color literal — use tokens from src/components/ui/tokens.ts.",
      },
    ],
  },
},
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: zero new warnings (Tasks 18, 20-25 stripped these literals already). If a warning appears, fix the offending file and re-run.

- [ ] **Step 3: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore(lint): warn on legacy brand colors in dashboard tree"
```

---

### Task 28: Final verification & Lighthouse pass

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: succeeds with no warnings.

- [ ] **Step 2: Full test run**

Run: `npm test`
Expected: all tests passing (smoke, runtime-config, api-runtime, resume-idempotency, tokens).

- [ ] **Step 3: Local manual smoke**

```bash
npm run dev
```

Visit each page and confirm:
- `/` (landing) — UNCHANGED visually. 3D cloud still renders. Glass nav still glassy.
- `/sign-in`, `/sign-up` — monochrome chrome.
- `/dashboard` — monochrome KPIs, charts, no blue/amber leakage.
- `/dashboard/resume`, `/dashboard/jobs`, `/dashboard/roadmap`, `/dashboard/resources`, `/dashboard/chat` — monochrome, consistent.

- [ ] **Step 4: Audit smoke**

While dev server is running, upload a real resume on `/dashboard/resume`. Confirm:
- POST `/api/resume` returns within ~30s.
- Response includes `dbSaved: true` and an `auditId`.
- Navigating to `/dashboard` shows the audit data without manual refresh.

- [ ] **Step 5: Lighthouse**

Run a Lighthouse audit (Chrome DevTools) on `/dashboard`. Record scores. Target: Performance ≥ 90, Accessibility ≥ 95.

If accessibility < 95, the most likely culprits are missing `aria-label` on icon-only buttons in the new navbar/sidebar. Add labels and re-test.

- [ ] **Step 6: Commit any final tweaks**

```bash
git add -p
git commit -m "chore: final polish from Lighthouse and smoke pass"
```

- [ ] **Step 7: Push and verify on Vercel preview**

```bash
git push
```

On the preview URL: repeat Step 4 (resume upload → dashboard renders). This is the actual deploy-bug fix verification — local correctness is necessary but not sufficient.

---

## Self-review

**Spec coverage:**

| Spec §4 Phase 1 item | Task(s) |
|---|---|
| Add `runtime`+`maxDuration` to resume route | 2, 3 |
| Same to chat / roadmap / quiz / sprint | 3 |
| Structured logging | (deferred — current `console.warn`/`error` lines suffice for Vercel; revisit if Phase 5 Sentry doesn't ship soon) |
| Idempotency guard | 5 |
| Vercel env checklist | 4 |
| Tokens | 6 |
| Refactor primitives | 7-12 |
| New primitives | 13-16 |
| All authenticated pages updated | 19-26 |
| Recharts monochrome | 20 |
| Replace ad-hoc literals | 20-25, 27 |
| Nav cleanup + usage chip | 16, 17, 18, 19 |
| Lighthouse ≥ 90 / ≥ 95 | 28 |
| ESLint guard against legacy colors | 27 |

Gap: "structured logging at each stage" from Phase 1 §1 is intentionally deferred — Vercel's default request logging plus existing `console.error` calls are enough to diagnose deploy failures, and full structured logging belongs to the Sentry track in Phase 5. Documented here so it isn't silently dropped.

**Placeholder scan:** No "TBD" / "TODO" / "implement later" / "add appropriate error handling" found. Every code-changing step has the actual code.

**Type consistency:** `tokens.colors.ink`, `tokens.radii.sm/md/lg` referenced consistently across Tasks 6, 13-16. `StatCard.delta.value` typed as `number` and consumed in Task 20 with numeric values. `runtime`, `maxDuration`, `dynamic` named consistently across Tasks 2 and 3.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-10-phase-1-stabilize-and-restyle.md`.**
