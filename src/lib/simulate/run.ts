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
