import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { sprintId, taskId } = await req.json();

    if (!sprintId || !taskId) {
      return NextResponse.json({ success: false, error: "Missing sprintId or taskId" }, { status: 400 });
    }

    const { db } = await import("@/db");
    const { weeklySprints, users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    // 1. Fetch the sprint
    const sprint = await db.query.weeklySprints.findFirst({
      where: eq(weeklySprints.id, sprintId),
    });

    if (!sprint) {
      return NextResponse.json({ success: false, error: "Sprint not found" }, { status: 404 });
    }

    // 2. Toggle the task
    const tasks = (sprint.tasks as any[]).map((t: any) => {
      if (t.id === taskId) {
        return { ...t, completed: !t.completed };
      }
      return t;
    });

    // 3. Calculate new completion rate
    const completedCount = tasks.filter((t: any) => t.completed).length;
    const completionRate = ((completedCount / tasks.length) * 100).toString();

    // 4. Update the sprint
    await db.update(weeklySprints)
      .set({ 
        tasks, 
        completionRate 
      })
      .where(eq(weeklySprints.id, sprintId));

    // 5. Streak logic
    if (completedCount === tasks.length) {
       const user = await db.query.users.findFirst({
         where: eq(users.id, sprint.userId as number)
       });
       
       if (user) {
         await db.update(users)
           .set({ streakCount: (user.streakCount || 0) + 1 })
           .where(eq(users.id, user.id));
       }
    }

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        completionRate
      }
    });
  } catch (error: unknown) {
    console.error("Task toggle error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
