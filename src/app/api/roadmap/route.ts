// ============================================
// CareerOS 2.0 — Learning Roadmap Generator API
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAI } from "@/lib/gemini";

// GET — Load user's active roadmap from DB
export async function GET(req: NextRequest) {
  try {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const { syncUserWithNeon } = await import("@/lib/user-sync");
    const { db } = await import("@/db");
    const { roadmaps } = await import("@/db/schema");
    const { eq, and, desc } = await import("drizzle-orm");

    const { userId: clerkId } = await auth();
    const user = await currentUser();

    if (!clerkId || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const email = user.emailAddresses[0].emailAddress;
    const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const dbUser = await syncUserWithNeon(clerkId, email, name);

    const activeRoadmap = await db.query.roadmaps.findFirst({
      where: and(eq(roadmaps.userId, dbUser.id), eq(roadmaps.isActive, true)),
      orderBy: [desc(roadmaps.createdAt)],
    });

    return NextResponse.json({
      success: true,
      data: activeRoadmap || null,
    });
  } catch (error: unknown) {
    console.error("Load roadmap error:", error);
    return NextResponse.json({
      success: true,
      data: null,
    });
  }
}

const ROADMAP_PROMPT = `You are the Career Roadmap Generator for CareerOS 2.0.
Generate a detailed, phased learning roadmap for any technology or career path.

OUTPUT: Return EXACTLY this JSON (no markdown, no code fences outside the JSON block):
{
  "title": "Complete Roadmap Title",
  "estimated_duration": "6 months",
  "difficulty": "Beginner to Advanced",
  "steps": [
    {
      "phase": "Phase 1: Foundation (Weeks 1-4)",
      "description": "Brief description of this phase's goals",
      "topics": [
        "Topic 1 — detailed description",
        "Topic 2 — detailed description",
        "Topic 3 — detailed description"
      ],
      "projects": ["Mini project to build in this phase"],
      "milestones": ["What you should be able to do after this phase"]
    }
  ]
}

Guidelines:
- Generate 5-8 phases for a comprehensive roadmap
- Each phase should have 3-6 topics
- Include practical projects for each phase
- Add clear milestones/checkpoints
- Progress from beginner to advanced concepts
- Include both theoretical and hands-on components
- Each topic should have enough detail to be actionable`;

export async function POST(req: NextRequest) {
  try {
    const { topic, currentSkills, targetRole } = await req.json();

    if (!topic) {
      return NextResponse.json(
        { success: false, error: "Topic is required" },
        { status: 400 }
      );
    }

    const model = getAI().getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: {
        role: "system",
        parts: [{ text: ROADMAP_PROMPT }],
      },
    });

    const skillContext = currentSkills?.length
      ? `\nThe user already knows: ${currentSkills.join(", ")}`
      : "";
    const roleContext = targetRole
      ? `\nTarget role: ${targetRole}`
      : "";

    const prompt = `Generate a comprehensive learning roadmap for: ${topic}${skillContext}${roleContext}

Make it practical, actionable, and progressive from fundamentals to advanced topics.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let roadmap;
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      roadmap = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse AI roadmap data" },
        { status: 500 }
      );
    }

    // Persist roadmap to DB
    let savedRoadmapId = null;
    try {
      const { auth, currentUser } = await import("@clerk/nextjs/server");
      const { syncUserWithNeon } = await import("@/lib/user-sync");
      const { db } = await import("@/db");
      const { roadmaps } = await import("@/db/schema");
      const { eq, and } = await import("drizzle-orm");

      const { userId: clerkId } = await auth();
      const user = await currentUser();

      if (clerkId && user) {
        const email = user.emailAddresses[0].emailAddress;
        const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        const dbUser = await syncUserWithNeon(clerkId, email, name);

        // Deactivate previous roadmaps for this user
        await db.update(roadmaps)
          .set({ isActive: false })
          .where(eq(roadmaps.userId, dbUser.id));

        // Save new roadmap
        const [saved] = await db.insert(roadmaps).values({
          userId: dbUser.id,
          title: roadmap.title || topic,
          topic: topic,
          targetRole: targetRole || null,
          estimatedDuration: roadmap.estimated_duration || null,
          difficulty: roadmap.difficulty || null,
          steps: roadmap.steps || [],
          sourceType: currentSkills?.length ? "auto" : "manual",
          completedPhases: {},
          topicChecklist: {},
          isActive: true,
        }).returning();

        savedRoadmapId = saved.id;
      }
    } catch (dbError) {
      console.warn("Roadmap DB persistence failed:", dbError);
    }

    return NextResponse.json({
      success: true,
      data: roadmap,
      roadmapId: savedRoadmapId,
    });
  } catch (error: unknown) {
    console.error("Roadmap generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
