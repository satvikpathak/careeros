// ============================================
// CareerOS 2.0 — Phase Quiz Generator API
// Generates MCQ quizzes for each roadmap phase
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAI } from "@/lib/gemini";

const QUIZ_PROMPT = `You are a technical quiz generator for CareerOS 2.0.
Generate a multiple-choice quiz to test knowledge of specific topics in a learning roadmap phase.

OUTPUT: Return EXACTLY this JSON (no markdown, no code fences outside the JSON block):
{
  "quiz_title": "Phase Quiz: [Phase Name]",
  "questions": [
    {
      "id": "q1",
      "question": "Clear, well-formed technical question?",
      "options": [
        "Option A (plausible wrong answer)",
        "Option B (correct answer)",
        "Option C (plausible wrong answer)",
        "Option D (plausible wrong answer)"
      ],
      "correct": 1,
      "explanation": "Brief explanation of why option B is correct"
    }
  ]
}

Guidelines:
- Generate exactly 5 questions per quiz
- Questions should range from basic to intermediate difficulty
- All 4 options should be plausible (no obviously wrong answers)
- "correct" is the 0-based index of the correct option in the "options" array
- Include a brief but insightful explanation for each answer
- Questions should cover the core topics provided
- Mix conceptual, practical, and scenario-based questions
- Ensure questions are unambiguous with exactly one correct answer`;

export async function POST(req: NextRequest) {
  try {
    const { phase, topics, context } = await req.json();

    if (!phase || !topics || topics.length === 0) {
      return NextResponse.json(
        { success: false, error: "Phase name and topics are required" },
        { status: 400 }
      );
    }

    const model = getAI().getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: {
        role: "system",
        parts: [{ text: QUIZ_PROMPT }],
      },
    });

    const contextStr = context ? `\nLearning context: ${context}` : "";

    const prompt = `Generate a quiz for this roadmap phase:

Phase: ${phase}
Topics covered:
${topics.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}
${contextStr}

Create 5 challenging but fair multiple-choice questions that test understanding of these topics.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let quiz;
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      quiz = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse quiz data" },
        { status: 500 }
      );
    }

    // Validate and normalize quiz structure
    if (quiz.questions) {
      quiz.questions = quiz.questions.map((q: any, i: number) => ({
        id: q.id || `q${i + 1}`,
        question: q.question,
        options: q.options?.slice(0, 4) || [],
        correct: typeof q.correct === "number" ? q.correct : 0,
        explanation: q.explanation || "",
      }));
    }

    return NextResponse.json({
      success: true,
      data: quiz,
    });
  } catch (error: unknown) {
    console.error("Quiz generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
