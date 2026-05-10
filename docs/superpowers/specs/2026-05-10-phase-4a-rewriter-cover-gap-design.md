# Phase 4A — Resume Rewriter + JD Gap Analyzer + Cover Letter

**Status:** Draft for review
**Date:** 2026-05-10
**Owner:** sanatan
**Parent spec:** `2026-05-10-careeros-saas-phased-plan-design.md` (Phase 4)
**Branch:** `phase-4a-rewriter-cover-gap`, stacked on `phase-3-dodo-billing`.

## 1. Why this slice

Master Phase 4 is the AI moat — five paid features. We're shipping the three that share infrastructure first:

- **Resume rewriter** — flagship Pro feature. Consumes a JD + the user's resume, produces tailored bullets.
- **JD gap analyzer** — runs the same JD parsing + keyword diff as the rewriter, but as a standalone read-only report. Free users get a teaser; Pro users get full edits + one-click apply.
- **Cover letter generator** — same JD parsing pipeline, different prompt + output.

All three are gated by the Phase 3 quota system (`canUse("rewriter")`, `canUse("cover_letter")`). The gap analyzer reuses the audit's `canUse("audit")` budget for the free-tier teaser.

Phase 4B handles outreach drafts + simulation v2 separately.

## 2. Goals

1. A Pro user uploads a JD URL or paste, generates a tailored resume, sees a per-bullet diff, accepts/rejects per change, and downloads `.docx` and `.pdf`.
2. A Pro user with a `.tex` resume on file (URL or paste) gets a modified `.tex` + unified diff. Download as `.tex`. CTA links to Overleaf for recompile.
3. A free user runs the gap analyzer once a month and gets keyword coverage + the **first 3** suggested edits. Pro users get the full report.
4. A Pro user generates a cover letter for a JD with a tone selector, edits inline, downloads `.docx`.

## 3. Non-goals

- **Server-side LaTeX compilation** — output `.tex` only. Phase 5 ops.
- **Auto-outreach drafts** — Phase 4B.
- **Career simulation v2** — Phase 4B.
- **Resume *parsing* changes** — keep the existing Phase 2A parsed-resume shape.
- **JD URL scraping for arbitrary domains** — allowlist (greenhouse, lever, linkedin, indeed, naukri, ashby, workday) + paste fallback.
- **Multi-language LLM prompts** — English only.
- **PDF rendering of rewritten resume** — generated via existing `docx` package (already a dep) → docx → server-side .docx-to-pdf via [docx-pdf path TBD]. Actually: `.docx` only in v1; the PDF download for the non-LaTeX path is deferred to Phase 5 ops. Updated below in §6.1.

## 4. Architecture

```
                     ┌────────────────────────────────────┐
                     │  /dashboard/resume/rewrite/[jdId]  │
                     │  /dashboard/resume/cover-letter    │
                     │  /dashboard/resume/gap-analyze     │
                     └────────────────┬───────────────────┘
                                      │
                                      ▼
                  POST /api/jd/parse        (parse + cache JD)
                       │
                       ▼
   POST /api/rewriter/run                ◀── Pro gate (canUse("rewriter"))
   POST /api/cover-letter/run            ◀── Pro gate (canUse("cover_letter"))
   POST /api/gap-analyze/run             ◀── audit-budget gate for free teaser
                       │
                       ▼
              Gemini 2.5 Flash
                       │
        ┌──────────────┴───────────────┐
        ▼                              ▼
   PDF flow                       LaTeX flow
   - parsed_resume                - .tex source
   - rewritten bullets[]          - regions identified
   - .docx download               - applied diff
   - .pdf [Phase 5]               - .tex download
                                  - "Compile in Overleaf" CTA
                       │
                       ▼
              Persisted in `resume_versions`
              (one row per output, keyed by jdHash)
```

**New modules:**
- `src/lib/jd/fetch.ts` — fetch + sanitize JD from allowlisted URLs (SSRF guarded).
- `src/lib/jd/parse.ts` — Gemini-powered JD parser → `{ title, company, requirements[], keywords[], niceToHaves[] }`.
- `src/lib/jd/cache.ts` — DB-backed cache by URL hash + content hash; avoid re-paying Gemini for the same JD.
- `src/lib/rewriter/run.ts` — orchestrates the rewrite (PDF or LaTeX path).
- `src/lib/rewriter/latex.ts` — LaTeX-source parsing + safe-region edit application.
- `src/lib/rewriter/diff.ts` — produce a per-bullet structured diff.
- `src/lib/rewriter/docx.ts` — render rewritten resume to `.docx` via the existing `docx` dep.
- `src/lib/cover-letter/run.ts` — generate cover letter with tone parameter.
- `src/lib/gap/run.ts` — produce gap report (keyword coverage, suggested edits).

**New routes:**
- `POST /api/jd/parse` — parse + cache a JD.
- `POST /api/rewriter/run` — produce a rewrite version (gated).
- `GET /api/rewriter/[id]` — load a saved version.
- `GET /api/rewriter/[id]/download` — download `.docx` or `.tex` (query param `?format=docx|tex`).
- `POST /api/cover-letter/run` — generate (gated).
- `GET /api/cover-letter/[id]` — load saved letter.
- `GET /api/cover-letter/[id]/download` — `.docx`.
- `POST /api/gap-analyze/run` — produce report (gated by audit budget for free; rewriter for Pro).

**New pages:**
- `/dashboard/resume/rewrite` — JD-input + version list.
- `/dashboard/resume/rewrite/[id]` — diff viewer with accept/reject + downloads.
- `/dashboard/resume/cover-letter` — JD + tone + output editor.
- `/dashboard/resume/gap-analyze` — JD-input + report viewer.

**Modified files:**
- `src/db/schema.ts` — `jds`, `resume_versions`, `cover_letters`, `gap_reports` tables.
- `src/app/dashboard/client-layout.tsx` — no nav change (these are sub-routes of Resume; one new "Rewrite & analyze" entry on the existing Resume page would add too much; we add tabs *inside* `/dashboard/resume` instead).
- `src/app/dashboard/resume/page.tsx` — add a tab strip linking to the four new sub-routes.

## 5. Data model

### `jds` (cache for parsed job descriptions)

```ts
export const jds = pgTable("jds", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  sourceUrl: varchar("source_url", { length: 1024 }),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  rawText: text("raw_text").notNull(),
  parsed: jsonb("parsed"), // { title, company, requirements, keywords, niceToHaves }
  createdAt: timestamp("created_at").defaultNow(),
});
// unique on (userId, contentHash)
```

### `resume_versions` (rewriter output)

```ts
export const resumeVersions = pgTable("resume_versions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jdId: integer("jd_id").references(() => jds.id),
  sourceKind: varchar("source_kind", { length: 10 }).notNull(), // "pdf" | "latex"
  // For LaTeX: original + modified content + diff segments
  originalTex: text("original_tex"),
  modifiedTex: text("modified_tex"),
  // For PDF: structured rewritten bullets per section
  rewrittenBullets: jsonb("rewritten_bullets"),
  // Per-bullet diff for the UI (both flows)
  diffSegments: jsonb("diff_segments"),
  status: varchar("status", { length: 20 }).notNull().default("ready"), // ready | failed
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### `cover_letters`

```ts
export const coverLetters = pgTable("cover_letters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jdId: integer("jd_id").references(() => jds.id),
  tone: varchar("tone", { length: 30 }).notNull(), // formal | conversational | concise
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### `gap_reports`

```ts
export const gapReports = pgTable("gap_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jdId: integer("jd_id").references(() => jds.id),
  coverage: jsonb("coverage"), // { matched: [], missing: [], score: 0..100 }
  suggestions: jsonb("suggestions"), // [{ section, original, suggested, rationale }]
  createdAt: timestamp("created_at").defaultNow(),
});
```

All four tables are additive. One Drizzle migration.

## 6. Component breakdown

### 6.1 JD pipeline

`POST /api/jd/parse` body: `{ url?: string, text?: string }`. Either URL or text required.

If URL provided:
- **Allowlist:** hostname must end with one of: `greenhouse.io`, `lever.co`, `linkedin.com`, `indeed.com`, `naukri.com`, `ashbyhq.com`, `workday.com`, `myworkdayjobs.com`. Anything else → 400 with "paste the JD text instead."
- **SSRF guard:** resolve hostname; reject private IP ranges (RFC1918 + loopback + link-local).
- **Size cap:** 200 KB.
- **Strip:** boilerplate (cookie banners, "apply now" buttons) via simple HTML→text + regex.

Hash the cleaned text → `contentHash`. Look up `jds` by `(userId, contentHash)`. If hit, return cached parsed. Else call Gemini with a JD-parsing prompt to extract `{ title, company, requirements[], keywords[], niceToHaves[] }`, persist, return.

The JD parse step is **not** quota-gated. It's a cheap step the user pays for via the downstream rewriter/cover/gap call.

### 6.2 Rewriter — PDF flow

Inputs: `jdId`, `sourceKind: "pdf"`. Reads the user's latest `careerAudits` row to get parsed bullets (we don't re-parse the PDF). Prompt:

```
Given this resume's bullets and this JD's requirements, rewrite each
bullet to maximize ATS keyword coverage while preserving accuracy.
Return JSON: { sections: [{ title, originalBullets[], rewrittenBullets[], rationale }] }
```

Persist to `resume_versions` with `rewrittenBullets`. Compute `diffSegments` as a per-bullet `{ original, suggested, accepted: null }` array.

UI: side-by-side or inline diff. User toggles Accept/Reject per bullet. The `diffSegments.accepted` boolean is patched via `PATCH /api/rewriter/[id]` (Pro only — quota gate already paid for the run).

Download: `GET /api/rewriter/[id]/download?format=docx`. Server renders a `.docx` from the **accepted** bullets via the existing `docx` package. PDF download is **deferred** — the .docx opens in Word/Google Docs and the user exports PDF themselves.

### 6.3 Rewriter — LaTeX flow

Inputs: `jdId`, `sourceKind: "latex"`, plus the LaTeX source — provided as either a `.tex` URL (allowlist: `raw.githubusercontent.com`, `gist.githubusercontent.com`, `overleaf.com` publish links) or a paste field (`texContent`).

Pipeline:
1. **Fetch** (URL case) with same SSRF guard. Size cap 5 MB.
2. **Identify safe regions** in `src/lib/rewriter/latex.ts`:
   - Find `\section{Experience}` / `\section{Projects}` (case-insensitive, also matches `\subsection*{...}`, `\cventry`, `\resumeSubheading`).
   - Within each, capture `\item ...` lines (or `\resumeItem{...}`, common template macros).
   - Untouched regions: preamble (everything before `\begin{document}`), macro defs, `\section{Education}`, `\section{Skills}` (because those are usually structured non-bullets).
3. **Send the JD + bullets** to Gemini for rewrite. Gemini returns the same shape as the PDF flow.
4. **Apply diff** by string-replacing each original bullet line with its rewritten version (preserving leading whitespace and any wrapping macros).
5. **Persist** `originalTex`, `modifiedTex`, `diffSegments`.

UI: code-style unified diff viewer (red-old / green-new lines). One toggle per bullet (accept/reject) regenerates `modifiedTex` server-side via `PATCH /api/rewriter/[id]`.

Download: `GET /api/rewriter/[id]/download?format=tex` returns the `modifiedTex` with `Content-Type: application/x-tex; Content-Disposition: attachment; filename="resume.tex"`.

CTA: "Compile in Overleaf" — a button that opens `https://www.overleaf.com/docs?snip_uri=<encoded modifiedTex>` in a new tab. Overleaf accepts a base64 snippet param and creates a new project.

### 6.4 Cover letter

`POST /api/cover-letter/run` body: `{ jdId, tone: "formal" | "conversational" | "concise" }`. Quota-gated. Reads parsed audit + parsed JD, calls Gemini with a tone-conditioned prompt, persists, returns body.

UI: a single textarea seeded with the generated letter. Edits are local (we don't autosave; user clicks Save → `PATCH /api/cover-letter/[id]`). Download: `.docx` only.

Optional linkage to applications: if the user has an `applications` row matching `jds.company`, surface a "Save to applications" button that writes a `coverLetterId` into a new `applications.coverLetterId` column. **Deferred** — adds an `applications` schema change. We'll add it in Phase 4B if it doesn't fit cleanly here.

### 6.5 Gap analyzer

`POST /api/gap-analyze/run` body: `{ jdId }`. Reads parsed JD + parsed audit. Computes:

- **Keyword coverage:** which JD `keywords` appear in the user's `skillMap` or resume bullets.
- **Per-section suggestions:** Gemini call producing `{ section, original, suggested, rationale }[]`.

Persist to `gap_reports`. UI: coverage bar + suggestions list.

**Free-tier teaser:** the `/api/gap-analyze/run` endpoint accepts the request without a Pro check, but the response trims `suggestions` to the first 3 items and adds a `truncated: true` flag if the user is on free. Pro users see all suggestions and a "Apply selected → rewriter" CTA that creates a `resume_versions` row from the chosen suggestions.

The gap-analyze endpoint **does** consume the audit quota for free users (one-per-month) and is unlimited for Pro. Use `canUse("audit")` for free, treat it as `canUse("rewriter")` for Pro path.

### 6.6 Quota integration

| Action | Free behavior | Pro/Team behavior |
|---|---|---|
| `/api/jd/parse` | Always allowed (cheap; no separate quota) | Always allowed |
| `/api/rewriter/run` | 402 (rewriter not in plan) | Allowed, `recordUsage("rewriter")` |
| `/api/cover-letter/run` | 402 (cover_letter not in plan) | Allowed, `recordUsage("cover_letter")` |
| `/api/gap-analyze/run` | Allowed, consumes `audit` quota; suggestions truncated to 3 | Allowed, `recordUsage("rewriter")` (treat as the same budget — unlimited for Pro) |

Quota-gate failures use the same HTTP 402 envelope as Phase 3 → `<UpgradeModal>` opens.

### 6.7 Resume page tabs

`/dashboard/resume` becomes a tabbed shell:

```
[ Audit (default) ]  [ Rewrite ]  [ Cover letter ]  [ Gap analyze ]
```

Each tab is its own sub-route. Audit tab keeps the existing audit upload + history flow. The other three are 4A.

## 7. Failure handling

| Failure | Behavior |
|---|---|
| JD URL fetch fails (404, timeout) | 422 with "Couldn't fetch this JD. Try pasting the text." |
| JD URL hostname not allowlisted | 400 with allowlist hint. UI offers paste field. |
| Gemini returns invalid JSON | Retry once with stricter prompt. If still bad, 502 + UI shows "Try again" |
| LaTeX no recognized sections | Return modified `.tex` unchanged + warning banner: "We couldn't find an Experience section. Paste manually or check macros." |
| LaTeX paste >5 MB | 413 |
| `.docx` render error | 500; UI shows "Download failed" |
| Quota exceeded | 402 → `<UpgradeModal>` (same as Phase 3) |
| User accepts/rejects bullets quickly (race) | Optimistic UI; `PATCH /api/rewriter/[id]` last-write-wins on `diffSegments` |

## 8. Tests

- `tests/jd-parse.test.ts` — JD allowlist + SSRF guard (mocked DNS); content-hash dedupe.
- `tests/rewriter-latex.test.ts` — region detection on three template fixtures (Awesome-CV, deedy, custom); diff application preserves whitespace.
- `tests/rewriter-diff.test.ts` — diff segment generation from before/after bullets.
- `tests/cover-letter-tone.test.ts` — prompt routing per tone; output shape.
- `tests/gap-coverage.test.ts` — keyword overlap math.
- `tests/rewriter-quota.test.ts` — `/api/rewriter/run` returns 402 for free user.
- `tests/gap-truncation.test.ts` — free tier gets 3 suggestions; pro gets all.

## 9. Risks

| Risk | Mitigation |
|---|---|
| LaTeX template variance breaks region detection | Template fixtures in tests; warning banner when no sections detected; user can paste a hint section name in v2 |
| LinkedIn / Workday pages are JS-rendered — fetch returns near-empty HTML | Document the failure mode; UI clearly offers paste fallback |
| Gemini hallucinates skills the user doesn't have | Prompt explicitly forbids inventing experience; rationale must cite an existing bullet; user can reject any rewrite |
| Overleaf snippet URL has a length limit (~50 KB url-encoded) | If `modifiedTex` exceeds 30 KB, swap CTA to "Download then upload to Overleaf" |
| `docx` package version drift | Pin existing version; snapshot a generated `.docx` shape in a test |
| User's parsed audit is stale (older than current resume) | Show a "Last audit: 6 days ago — re-upload your resume?" inline when `careerAudits.createdAt` is >14d old |
| ATS scraping abuse via JD URL fetch | Same SSRF guard as LaTeX URL; per-user rate limit (10 JDs / hour) via `usage_events` count |

## 10. Rollout

1. Apply migration to dev Neon.
2. Smoke: paste a Greenhouse JD → see parsed output. Run rewriter (Pro account). Open diff. Toggle bullets. Download `.docx`.
3. Paste a `.tex` (Awesome-CV fixture) → see modified diff. Download `.tex`. Click "Compile in Overleaf" → opens new project.
4. Run cover letter on the same JD → tone toggle works.
5. As a free user, run gap analyzer → see 3 truncated suggestions + upgrade CTA.
6. Promote to prod after preview validation.

## 11. Open questions

None blocking. Two YAGNI'd:
- Server-side LaTeX compile to PDF — Phase 5 ops.
- PDF (not just .docx) for the non-LaTeX rewriter download — Phase 5 ops.

---

**Next step after approval:** invoke `writing-plans` to break Phase 4A into tasks.
