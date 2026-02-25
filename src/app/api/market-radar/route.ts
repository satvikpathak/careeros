// ============================================
// CareerOS 2.0 — Market Radar API
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAI } from "@/lib/gemini";

export const MARKET_RADAR_PROMPT = `
You are the Market Radar AI for CareerOS 2.0.
Your task is to analyze current hiring trends in the technology sector (focusing on India but globally aware).

OUTPUT: Return EXACTLY this JSON:
{
  "trending_tech_stacks": [
    { "name": "Next.js + Tailwind", "demand_score": 95, "trend": "rising" },
    { "name": "Go + Microservices", "demand_score": 85, "trend": "rising" },
    { "name": "Python + AI/ML", "demand_score": 98, "trend": "stable" }
  ],
  "skill_demand_growth": [
    { "category": "Frontend", "growth": 12 },
    { "category": "Backend", "growth": 18 },
    { "category": "DevOps", "growth": 25 },
    { "category": "AI Engineers", "growth": 45 }
  ],
  "salary_insights": {
    "entry_level": "₹6L - ₹12L",
    "mid_level": "₹15L - ₹30L",
    "senior_level": "₹40L+"
  },
  "market_alignment_score": 88
}
`;

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const model = getAI().getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: MARKET_RADAR_PROMPT,
    });

    const result = await model.generateContent("Analyze current market trends for Q1 2026.");
    const responseText = result.response.text();

    let marketData;
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      marketData = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse AI market data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: marketData
    });
  } catch (error: unknown) {
    console.error("Market Radar error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
