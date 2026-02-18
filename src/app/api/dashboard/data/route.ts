import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, careerAudits, weeklySprints, projects, skillProgress } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { syncUserWithNeon } from "@/lib/user-sync";

export async function GET(req: NextRequest) {
  try {
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
    
    // 1. Sync User
    const dbUser = await syncUserWithNeon(clerkId, email, name);

    // 2. Fetch Latest Audit
    const latestAudit = await db.query.careerAudits.findFirst({
      where: eq(careerAudits.userId, dbUser.id),
      orderBy: [desc(careerAudits.createdAt)],
    });

    // 3. Fetch Latest Sprint
    const latestSprint = await db.query.weeklySprints.findFirst({
      where: eq(weeklySprints.userId, dbUser.id),
      orderBy: [desc(weeklySprints.createdAt)],
    });

    // 4. Fetch Projects
    const userProjects = await db.query.projects.findMany({
      where: eq(projects.userId, dbUser.id),
      orderBy: [desc(projects.createdAt)],
      limit: 5,
    });

    // 5. Fetch Skill Progress
    const progress = await db.query.skillProgress.findMany({
      where: eq(skillProgress.userId, dbUser.id),
    });

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
        audit: latestAudit || null,
        sprint: latestSprint || null,
        projects: userProjects,
        skillProgress: progress,
      },
    });
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
