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
