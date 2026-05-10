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

  const flatRewrites = parsed.sections.flatMap((s) => s.rewrittenBullets);
  const edits = bullets.map((b, i) => ({ ...b, suggested: flatRewrites[i] ?? b.text }));
  const modifiedTex = applyBulletEdits(tex, edits);

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
