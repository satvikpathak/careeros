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
