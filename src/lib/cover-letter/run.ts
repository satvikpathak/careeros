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
