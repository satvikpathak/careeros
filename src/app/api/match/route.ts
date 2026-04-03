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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function lexicalSimilarity(aText: string, bText: string): number {
  const aTokens = new Set(tokenize(aText));
  const bTokens = new Set(tokenize(bText));

  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection += 1;
  }

  return intersection / Math.max(aTokens.size, bTokens.size);
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

    // Generate resume embedding (best effort)
    const resumeEmbedding = await generateEmbedding(resumeText);
    const canUseEmbeddings = resumeEmbedding.length > 0;

    // Compute similarity per job, with lexical fallback if embeddings fail
    const matchResults = await Promise.all(
      jobs.map(async (job: { id: string; title: string; description: string; company: string }) => {
        const jobText = `${job.title} at ${job.company}. ${job.description}`;

        if (canUseEmbeddings) {
          try {
            const jobEmbedding = await generateEmbedding(jobText);
            if (jobEmbedding.length > 0) {
              const score = cosineSimilarity(resumeEmbedding, jobEmbedding);
              return {
                job_id: job.id,
                match_score: Math.round(score * 10000) / 10000,
              };
            }
          } catch {
            // fall through to lexical score
          }
        }

        const lexicalScore = lexicalSimilarity(resumeText, jobText);
        return {
          job_id: job.id,
          match_score: Math.round(lexicalScore * 10000) / 10000,
        };
      })
    );

    // Sort by match score descending
    matchResults.sort((a, b) => b.match_score - a.match_score);

    return NextResponse.json({
      success: true,
      data: matchResults.slice(0, 20),
      meta: {
        method: canUseEmbeddings ? "embedding+lexical-fallback" : "lexical-fallback",
      },
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
