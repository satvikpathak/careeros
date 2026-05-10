// ============================================
// CareerOS 2.0 — AI Interview / Placement Prep API
// ============================================

import { NextRequest, NextResponse } from "next/server";
import {
  chatWithGemini,
  PLACEMENT_PREP_PROMPT,
} from "@/lib/gemini";

import type { HeavyRouteConfig } from "@/lib/runtime-config";
export const runtime: HeavyRouteConfig["runtime"] = "nodejs";
export const maxDuration: HeavyRouteConfig["maxDuration"] = 60;
export const dynamic: HeavyRouteConfig["dynamic"] = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Use Placement Mode prompt for CareerOS 2.0
    const response = await chatWithGemini(messages, PLACEMENT_PREP_PROMPT);

    return NextResponse.json({
      success: true,
      data: {
        content: response,
      },
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
