// ============================================
// CareerOS — Semantic Matching API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/gemini";

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobs } = await req.json();

    if (!resumeText || !jobs || !Array.isArray(jobs)) {
      return NextResponse.json(
        { success: false, error: "resumeText and jobs array are required" },
        { status: 400 }
      );
    }

    // Generate resume embedding
    const resumeEmbedding = await generateEmbedding(resumeText);

    if (resumeEmbedding.length === 0) {
      return NextResponse.json(
        { success: false, error: "Failed to generate resume embedding" },
        { status: 500 }
      );
    }

    // Generate embeddings for each job and compute similarity
    const matchResults = await Promise.all(
      jobs.map(async (job: { id: string; title: string; description: string; company: string }) => {
        try {
          const jobText = `${job.title} at ${job.company}. ${job.description}`;
          const jobEmbedding = await generateEmbedding(jobText);
          const score = cosineSimilarity(resumeEmbedding, jobEmbedding);

          return {
            job_id: job.id,
            match_score: Math.round(score * 10000) / 10000,
          };
        } catch {
          return {
            job_id: job.id,
            match_score: 0,
          };
        }
      })
    );

    // Sort by match score descending
    matchResults.sort((a, b) => b.match_score - a.match_score);

    return NextResponse.json({
      success: true,
      data: matchResults.slice(0, 20),
    });
  } catch (error: unknown) {
    console.error("Matching error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Matching failed",
      },
      { status: 500 }
    );
  }
}
