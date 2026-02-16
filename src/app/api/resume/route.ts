// ============================================
// CareerOS — Resume Upload & Parse API Route
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { uploadToS3 } from "@/lib/s3";
import { parseResumeWithGemini, generateEmbedding } from "@/lib/gemini";
import { PDFParse } from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    // 1. Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2. Upload to S3
    let s3Url = "";
    try {
      s3Url = await uploadToS3(buffer, file.name, file.type);
    } catch (s3Error) {
      console.warn("S3 upload failed, continuing with parsing:", s3Error);
      s3Url = `local://${file.name}`;
    }

    // 3. Extract text from PDF
    const pdf = new PDFParse({ data: new Uint8Array(bytes) });
    const textResult = await pdf.getText();
    const resumeText = textResult.text;

    if (!resumeText || resumeText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Could not extract text from PDF" },
        { status: 422 }
      );
    }

    // 4. Parse with Gemini
    const parsedResponse = await parseResumeWithGemini(resumeText);

    // Extract JSON from response (handle markdown code blocks)
    let parsedData;
    try {
      const jsonMatch = parsedResponse.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : parsedResponse;
      parsedData = JSON.parse(jsonStr);
    } catch {
      parsedData = {
        skills: [],
        experience_years: "0",
        education: [],
        projects: [],
        strength_score: 0,
        missing_keywords: [],
        summary: resumeText.substring(0, 500),
      };
    }

    // 5. Generate embedding for semantic matching
    let embedding: number[] = [];
    try {
      const summaryText = `${parsedData.skills?.join(", ")} ${parsedData.summary || ""} ${parsedData.experience_years} years experience`;
      embedding = await generateEmbedding(summaryText);
    } catch (embError) {
      console.warn("Embedding generation failed:", embError);
    }

    return NextResponse.json({
      success: true,
      data: {
        s3_url: s3Url,
        file_name: file.name,
        parsed_data: parsedData,
        embedding: embedding.length > 0 ? embedding : undefined,
        raw_text_length: resumeText.length,
      },
    });
  } catch (error: unknown) {
    console.error("Resume parse error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to parse resume",
      },
      { status: 500 }
    );
  }
}

// Next.js App Router handles body parsing automatically for FormData
// No additional config needed
