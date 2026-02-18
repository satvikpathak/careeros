// ============================================
// CareerOS 2.0 — AI Project Builder API
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAI, PROJECT_BUILDER_PROMPT } from "@/lib/gemini";
import { auth, currentUser } from "@clerk/nextjs/server";
import { syncUserWithNeon } from "@/lib/user-sync";
import { db } from "@/db";
import { projects } from "@/db/schema";

export async function POST(req: NextRequest) {
  try {
    const { audit, targetRole } = await req.json();

    const model = getAI().getGenerativeModel({
      model: "gemini-2.0-flash",
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

    // 6. DB Persistence
    const { userId: clerkId } = await auth();
    const user = await currentUser();
    
    let dbUser = null;
    const savedProjectIds: number[] = [];

    if (clerkId && user && Array.isArray(projectIdeas)) {
      const email = user.emailAddresses[0].emailAddress;
      const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      
      // Sync user
      dbUser = await syncUserWithNeon(clerkId, email, name);

      // Save projects
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
