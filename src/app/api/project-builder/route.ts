// ============================================
// CareerOS 2.0 — AI Project Builder API
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAI, PROJECT_BUILDER_PROMPT } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { audit, targetRole } = await req.json();

    const model = getAI().getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: PROJECT_BUILDER_PROMPT,
    });

    const prompt = `
      USER AUDIT: ${JSON.stringify(audit || "No audit found")}
      TARGET ROLE: ${targetRole || "Software Engineer"}
      
      Generate 3 portfolio-grade project ideas.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let projectIdeas;
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      projectIdeas = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse AI project ideas" },
        { status: 500 }
      );
    }

    // DB Persistence — best effort
    let dbUser = null;
    const savedProjectIds: number[] = [];

    try {
      const { auth, currentUser } = await import("@clerk/nextjs/server");
      const { syncUserWithNeon } = await import("@/lib/user-sync");
      const { db } = await import("@/db");
      const { projects } = await import("@/db/schema");

      const { userId: clerkId } = await auth();
      const user = await currentUser();

      if (clerkId && user && Array.isArray(projectIdeas)) {
        const email = user.emailAddresses[0].emailAddress;
        const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        dbUser = await syncUserWithNeon(clerkId, email, name);

        for (const idea of projectIdeas) {
          const [savedProject] = await db.insert(projects).values({
            userId: dbUser.id,
            title: idea.title,
            role: targetRole || "Software Engineer",
            description: idea.description,
            techStack: idea.tech_stack,
            features: idea.features,
            architecture: idea.architecture,
            deploymentGuide: idea.deployment_guide,
            resumePoints: idea.resume_points,
          }).returning();

          savedProjectIds.push(savedProject.id);
        }
      }
    } catch (dbError) {
      console.warn("Project builder DB persistence failed:", dbError);
    }

    return NextResponse.json({
      success: true,
      data: projectIdeas,
      projectIds: savedProjectIds,
      userId: dbUser?.id,
    });
  } catch (error: unknown) {
    console.error("Project Builder error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
