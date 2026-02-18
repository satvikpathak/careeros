// ============================================
// CareerOS 2.0 — Unified Career Audit API
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";
import { parseResumeWithGemini, generateEmbedding } from "@/lib/gemini";
import pdf from "pdf-parse-fork";
import { getGitHubProfileData } from "@/lib/github";
import { auth, currentUser } from "@clerk/nextjs/server";
import { syncUserWithNeon } from "@/lib/user-sync";
import { db } from "@/db";
import { careerAudits, users } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    // 2. Upload to S3 (Background/Optional)
    let s3Url = "";
    try {
      s3Url = await uploadToS3(buffer, file.name, file.type);
    } catch (s3Error) {
      console.warn("S3 upload failed:", s3Error);
      s3Url = `local://${file.name}`;
    }

    // 3. GitHub Analysis (if URL provided)
    let githubStats = null;
    if (githubUrl) {
      const username = githubUrl.split("/").pop();
      if (username) {
        githubStats = await getGitHubProfileData(username);
      }
    }

    // 4. Unified AI Audit (Gemini)
    const auditDataRaw = await parseResumeWithGemini(
      `RESUME:\n${resumeText}\n\nGITHUB_STATS:\n${JSON.stringify(githubStats || "None")}`,
      targetRole
    );

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

    // 5. Generate embedding for matching
    let embedding: number[] = [];
    try {
      const summaryText = `${Object.keys(audit.skill_map).join(", ")} ${audit.skill_gaps.join(", ")} ${targetRole}`;
      embedding = await generateEmbedding(summaryText);
    } catch (embError) {
      console.warn("Embedding generation failed:", embError);
    }

    // 6. DB Persistence
    const { userId: clerkId } = await auth();
    const user = await currentUser();
    
    let dbUser = null;
    let savedAuditId = null;

    if (clerkId && user) {
      const email = user.emailAddresses[0].emailAddress;
      const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      
      // Sync user
      dbUser = await syncUserWithNeon(clerkId, email, name);

      // Save audit
      const [savedAudit] = await db.insert(careerAudits).values({
        userId: dbUser.id,
        readinessScore: audit.readiness_score,
        marketMatchScore: audit.market_match_score,
        projectQualityScore: audit.project_quality_score,
        skillMap: audit.skill_map,
        atsKeywordAnalysis: {
          recommendations: audit.ats_recommendations,
          skill_gaps: audit.skill_gaps,
          depth_vs_breadth: audit.depth_vs_breadth,
          market_alignment: audit.market_alignment_insights
        },
        githubAnalysis: githubStats,
      }).returning();
      
      savedAuditId = savedAudit.id;

      // Update user's last audit time
      await db.update(users)
        .set({ lastAuditAt: new Date() })
        .where(eq(users.id, dbUser.id));
    }

    return NextResponse.json({
      success: true,
      data: {
        s3_url: s3Url,
        file_name: file.name,
        audit,
        github: githubStats,
        embedding: embedding.length > 0 ? embedding : undefined,
        auditId: savedAuditId,
        userId: dbUser?.id,
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
