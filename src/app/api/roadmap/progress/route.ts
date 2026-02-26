import { NextRequest, NextResponse } from "next/server";

// PUT — Update roadmap progress (completed phases, topic checklist)
export async function PUT(req: NextRequest) {
  try {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { syncUserWithNeon } = await import("@/lib/user-sync");
    const { db } = await import("@/db");
    const { roadmaps } = await import("@/db/schema");
    const { eq, and } = await import("drizzle-orm");

    const { userId: clerkId } = await auth();
    const user = await currentUser();

    if (!clerkId || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const email = user.emailAddresses[0].emailAddress;
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const dbUser = await syncUserWithNeon(clerkId, email, name);

    const { completedPhases, topicChecklist, roadmapId } = await req.json();

    if (roadmapId) {
      await db.update(roadmaps)
        .set({
          completedPhases: completedPhases || {},
          topicChecklist: topicChecklist || {},
        })
        .where(and(eq(roadmaps.id, roadmapId), eq(roadmaps.userId, dbUser.id)));
    } else {
      // Update the active roadmap
      const active = await db.query.roadmaps.findFirst({
        where: and(eq(roadmaps.userId, dbUser.id), eq(roadmaps.isActive, true)),
      });
      if (active) {
        await db.update(roadmaps)
          .set({
            completedPhases: completedPhases || {},
            topicChecklist: topicChecklist || {},
          })
          .where(eq(roadmaps.id, active.id));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Roadmap progress update error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
