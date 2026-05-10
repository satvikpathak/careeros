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

    const [auditRaw, _parsedRaw] = await Promise.all([
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
    } catch {
      // embedding is best-effort
    }

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
