import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Dynamic imports to prevent build-time failures when env vars are missing
    const { auth, currentUser } = await import("@clerk/nextjs/server");

    const { userId: clerkId } = await auth();
    const clerkUser = await currentUser();

    if (!clerkId || !clerkUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const email = clerkUser.emailAddresses[0].emailAddress;
    const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();

    // Try DB operations; return empty data if DB is unavailable
    try {
      const { db } = await import("@/db");
      const { users, careerAudits, weeklySprints, projects, skillProgress } = await import("@/db/schema");
      const { eq, desc } = await import("drizzle-orm");
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

      return NextResponse.json({
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
        },
      });
    } catch (dbError) {
      console.warn("DB operations failed, returning empty data:", dbError);
      return NextResponse.json({
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
        },
      });
    }
  } catch (error: unknown) {
    console.error("Dashboard data error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
