import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    // Dynamic imports to prevent build-time failures when env vars are missing
    const { auth, currentUser } = await import("@clerk/nextjs/server");

    const { userId: clerkId } = await auth();
    const clerkUser = await currentUser();

    if (!clerkId || !clerkUser) {
      return noStoreJson(
        { success: false, error: "Unauthorized" },
        401
      );
    }

    const email = clerkUser.emailAddresses[0].emailAddress;
    const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();

    // Try DB operations; return empty data if DB is unavailable
    try {
      const { db } = await import("@/db");
      const { users, careerAudits, weeklySprints, projects, skillProgress, roadmaps } = await import("@/db/schema");
      const { eq, desc, and } = await import("drizzle-orm");
      const { syncUserWithNeon } = await import("@/lib/user-sync");

      const dbUser = await syncUserWithNeon(clerkId, email, name);

      const latestAudit = await db.query.careerAudits.findFirst({
        where: eq(careerAudits.userId, dbUser.id),
        orderBy: [desc(careerAudits.createdAt)],
      });

      const latestSprint = await db.query.weeklySprints.findFirst({
        where: eq(weeklySprints.userId, dbUser.id),
        orderBy: [desc(weeklySprints.createdAt)],
      });

      const userProjects = await db.query.projects.findMany({
        where: eq(projects.userId, dbUser.id),
        orderBy: [desc(projects.createdAt)],
        limit: 5,
      });

      const progress = await db.query.skillProgress.findMany({
        where: eq(skillProgress.userId, dbUser.id),
      });

      // Load active roadmap
      const activeRoadmap = await db.query.roadmaps.findFirst({
        where: and(eq(roadmaps.userId, dbUser.id), eq(roadmaps.isActive, true)),
        orderBy: [desc(roadmaps.createdAt)],
      });

      // Normalize audit data to ensure consistent camelCase field names
      // This handles edge cases where data might have been stored differently
      const normalizedAudit = latestAudit ? {
        ...latestAudit,
        readinessScore: latestAudit.readinessScore ?? (latestAudit as any).readiness_score ?? 0,
        marketMatchScore: latestAudit.marketMatchScore ?? (latestAudit as any).market_match_score ?? 0,
        projectQualityScore: latestAudit.projectQualityScore ?? (latestAudit as any).project_quality_score ?? 0,
        skillMap: latestAudit.skillMap ?? (latestAudit as any).skill_map ?? {},
        atsKeywordAnalysis: latestAudit.atsKeywordAnalysis ?? (latestAudit as any).ats_keyword_analysis ?? {},
      } : null;

      return noStoreJson({
        success: true,
        data: {
          user: {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            streak: dbUser.streakCount,
            tier: dbUser.subscriptionTier,
          },
          audit: normalizedAudit,
          sprint: latestSprint || null,
          projects: userProjects,
          skillProgress: progress,
          roadmap: activeRoadmap ? {
            id: activeRoadmap.id,
            title: activeRoadmap.title,
            topic: activeRoadmap.topic,
            targetRole: activeRoadmap.targetRole,
            estimatedDuration: activeRoadmap.estimatedDuration,
            difficulty: activeRoadmap.difficulty,
            steps: activeRoadmap.steps,
            sourceType: activeRoadmap.sourceType,
            completedPhases: activeRoadmap.completedPhases || {},
            topicChecklist: activeRoadmap.topicChecklist || {},
          } : null,
        },
      });
    } catch (dbError) {
      console.warn("DB operations failed, returning empty data:", dbError);
      return noStoreJson({
        success: true,
        data: {
          user: {
            id: 0,
            name: name,
            email: email,
            streak: 0,
            tier: "free",
          },
          audit: null,
          sprint: null,
          projects: [],
          skillProgress: [],
          roadmap: null,
        },
      });
    }
  } catch (error: unknown) {
    console.error("Dashboard data error:", error);
    return noStoreJson(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      500
    );
  }
}
