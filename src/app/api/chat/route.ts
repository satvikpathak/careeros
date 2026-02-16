// ============================================
// CareerOS — AI Chat API Route (Streaming)
// Supports: career agent + pathfinder mode
// ============================================

import { NextRequest, NextResponse } from "next/server";
import {
  chatWithGemini,
  streamChatWithGemini,
  CAREER_AGENT_SYSTEM_PROMPT,
  PATHFINDER_SYSTEM_PROMPT,
} from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { messages, stream = false, mode = "career" } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Choose system prompt based on mode
    const systemPrompt =
      mode === "pathfinder"
        ? PATHFINDER_SYSTEM_PROMPT
        : CAREER_AGENT_SYSTEM_PROMPT;

    if (stream) {
      // Streaming response
      const streamResponse = await streamChatWithGemini(messages, systemPrompt);

      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamResponse) {
              const text = chunk.text || "";
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
                );
              }
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (error) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
              )
            );
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming response
    const response = await chatWithGemini(messages, systemPrompt);

    // Extract progress metadata if present (pathfinder mode)
    let progress = null;
    const progressMatch = response.match(
      /<!--PROGRESS:([\s\S]*?)-->/
    );
    if (progressMatch) {
      try {
        progress = JSON.parse(progressMatch[1]);
      } catch {
        // ignore parse errors
      }
    }

    // Clean the response — remove progress tag from displayed content
    const cleanContent = response.replace(/<!--PROGRESS:[\s\S]*?-->/g, "").trim();

    return NextResponse.json({
      success: true,
      data: {
        content: cleanContent,
        progress,
        mode,
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
