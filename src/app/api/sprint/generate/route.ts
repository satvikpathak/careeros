// ============================================
// CareerOS 2.0 — Weekly Sprint Generator API
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAI, SPRINT_GENERATOR_PROMPT } from "@/lib/gemini";
import { auth, currentUser } from "@clerk/nextjs/server";
import { syncUserWithNeon } from "@/lib/user-sync";
import { db } from "@/db";
import { weeklySprints } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { audit, targetRole, weekNumber } = await req.json();

    if (!audit || !targetRole) {
      return NextResponse.json(
        { success: false, error: "Missing required audit data or target role" },
        { status: 400 }
      );
    }

    const model = getAI().getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SPRINT_GENERATOR_PROMPT,
    });

    const prompt = `
      CURRENT AUDIT: ${JSON.stringify(audit)}
      TARGET ROLE: ${targetRole}
      WEEK NUMBER: ${weekNumber || 1}
      
      Generate a set of 5 actionable tasks for this week.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let sprintData;
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      sprintData = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse AI sprint data" },
        { status: 500 }
      );
    }

    // Add completion status to tasks
    sprintData.tasks = sprintData.tasks.map((task: any) => ({
      ...task,
      completed: false
    }));

    // 6. DB Persistence
    const { userId: clerkId } = await auth();
    const user = await currentUser();
    
    let dbUser = null;
    let savedSprintId = null;

    if (clerkId && user) {
      const email = user.emailAddresses[0].emailAddress;
      const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      
      // Sync user
      dbUser = await syncUserWithNeon(clerkId, email, name);

      // Save sprint
      const [savedSprint] = await db.insert(weeklySprints).values({
        userId: dbUser.id,
        weekNumber: sprintData.week_number || weekNumber || 1,
        year: new Date().getFullYear(),
        tasks: sprintData.tasks,
        completionRate: "0",
      }).returning();
      
      savedSprintId = savedSprint.id;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...sprintData,
        sprintId: savedSprintId,
        userId: dbUser?.id,
      }
    });
  } catch (error: unknown) {
    console.error("Sprint generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
