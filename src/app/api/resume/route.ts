// ============================================
// CareerOS 2.0 — Unified Career Audit API
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { parseResumeWithGemini, parseResumeStructured, generateEmbedding } from "@/lib/gemini";
import pdf from "pdf-parse-fork";
import { getGitHubProfileData } from "@/lib/github";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const githubUrl = formData.get("githubUrl") as string || "";
    const targetRole = formData.get("targetRole") as string || "Software Engineer";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    // 1. Read file buffer & Extract Text
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const pdfData = await pdf(buffer);
    const resumeText = pdfData.text;

    if (!resumeText || resumeText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Could not extract text from PDF" },
        { status: 422 }
      );
    }

    // 2. S3 upload — best effort, non-blocking
    let s3Url = `local://${file.name}`;
    try {
      const { uploadToS3 } = await import("@/lib/s3");
      s3Url = await uploadToS3(buffer, file.name, file.type);
    } catch (s3Error) {
      console.warn("S3 upload skipped/failed:", s3Error);
    }

    // 3. GitHub Analysis (if URL provided)
    let githubStats = null;
    if (githubUrl) {
      const username = githubUrl.split("/").pop();
      if (username) {
        try {
          githubStats = await getGitHubProfileData(username);
        } catch (ghError) {
          console.warn("GitHub analysis failed:", ghError);
        }
      }
    }

    // 4. Run both AI tasks in parallel: Career Audit + Structured Parse
    const [auditDataRaw, parsedDataRaw] = await Promise.all([
      parseResumeWithGemini(
        `RESUME:\n${resumeText}\n\nGITHUB_STATS:\n${JSON.stringify(githubStats || "None")}`,
        targetRole
      ),
      parseResumeStructured(resumeText, targetRole),
    ]);

    // Parse career audit
    let audit;
    try {
      const jsonMatch = auditDataRaw.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : auditDataRaw;
      audit = JSON.parse(jsonStr);
    } catch {
      audit = {
        readiness_score: 0,
        market_match_score: 0,
        project_quality_score: 0,
        skill_map: {},
        skill_gaps: [],
        depth_vs_breadth: "N/A",
        ats_recommendations: [],
        market_alignment_insights: "AI matching failed",
      };
    }

    // Parse structured resume data
    let parsedResume;
    try {
      const jsonMatch = parsedDataRaw.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : parsedDataRaw;
      parsedResume = JSON.parse(jsonStr);
    } catch {
      // Fallback: build from audit data
      parsedResume = {
        skills: Object.keys(audit.skill_map || {}),
        experience_years: "0",
        education: [],
        projects: [],
        strength_score: audit.readiness_score || 0,
        missing_keywords: audit.skill_gaps || [],
        summary: audit.depth_vs_breadth || "",
      };
    }

    // 5. Generate embedding — best effort
    let embedding: number[] = [];
    try {
      const summaryText = `${Object.keys(audit.skill_map || {}).join(", ")} ${(audit.skill_gaps || []).join(", ")} ${targetRole}`;
      embedding = await generateEmbedding(summaryText);
    } catch (embError) {
      console.warn("Embedding generation failed:", embError);
    }

    // 6. DB Persistence — critical for dashboard to show audit
    let dbUser = null;
    let savedAuditId = null;
    let dbSaveError = null;

    try {
      const { auth, currentUser } = await import("@clerk/nextjs/server");
      const { syncUserWithNeon } = await import("@/lib/user-sync");
      const { db } = await import("@/db");
      const { careerAudits, users } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      const { userId: clerkId } = await auth();
      const user = await currentUser();

      if (clerkId && user) {
        const email = user.emailAddresses[0].emailAddress;
        const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        dbUser = await syncUserWithNeon(clerkId, email, name);

        // Ensure scores are valid numbers
        const readiness = typeof audit.readiness_score === 'number' ? audit.readiness_score : parseInt(audit.readiness_score) || 0;
        const marketMatch = typeof audit.market_match_score === 'number' ? audit.market_match_score : parseInt(audit.market_match_score) || 0;
        const projectQuality = typeof audit.project_quality_score === 'number' ? audit.project_quality_score : parseInt(audit.project_quality_score) || 0;

        const [savedAudit] = await db.insert(careerAudits).values({
          userId: dbUser.id,
          readinessScore: readiness,
          marketMatchScore: marketMatch,
          projectQualityScore: projectQuality,
          skillMap: audit.skill_map || {},
          atsKeywordAnalysis: {
            recommendations: audit.ats_recommendations || [],
            skill_gaps: audit.skill_gaps || [],
            depth_vs_breadth: audit.depth_vs_breadth || "",
            market_alignment: audit.market_alignment_insights || "",
          },
          githubAnalysis: githubStats,
        }).returning();

        savedAuditId = savedAudit.id;

        await db.update(users)
          .set({ lastAuditAt: new Date() })
          .where(eq(users.id, dbUser.id));
      } else {
        dbSaveError = "User not authenticated — audit not saved to database";
        console.warn(dbSaveError);
      }
    } catch (dbError) {
      dbSaveError = dbError instanceof Error ? dbError.message : "DB persistence failed";
      console.error("DB persistence failed:", dbError);
    }

    return NextResponse.json({
      success: true,
      data: {
        s3_url: s3Url,
        file_name: file.name,
        parsed_data: parsedResume,
        audit,
        github: githubStats,
        embedding: embedding.length > 0 ? embedding : undefined,
        auditId: savedAuditId,
        userId: dbUser?.id,
        dbSaved: !!savedAuditId,
        dbSaveError: dbSaveError || undefined,
      },
    });
  } catch (error: unknown) {
    console.error("Unified Audit error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
