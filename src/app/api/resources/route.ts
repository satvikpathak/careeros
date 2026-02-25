// ============================================
// CareerOS 2.0 — Learning Resources API
// Uses Gemini to generate curated resource recommendations
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAI } from "@/lib/gemini";

const RESOURCES_PROMPT = `You are a learning resource curator for CareerOS 2.0.
Given a topic or list of skill gaps, generate curated learning resources.

OUTPUT: Return EXACTLY this JSON (no markdown, no code fences outside the JSON block):
{
  "topic": "The topic searched for",
  "youtube_playlists": [
    {
      "title": "Playlist title",
      "link": "https://www.youtube.com/playlist?list=EXAMPLE",
      "thumbnail": "https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg",
      "channel": "Channel Name",
      "video_count": "15 videos",
      "description": "Brief description of what the playlist covers"
    }
  ],
  "courses": [
    {
      "name": "Course title",
      "registrationLink": "https://www.udemy.com/course/example or https://www.coursera.org/learn/example",
      "description": "Brief course description",
      "rating": 4.5,
      "thumbnail": "https://img-c.udemycdn.com/course/480x270/placeholder.jpg",
      "workload": "40 hours total",
      "platform": "Udemy"
    }
  ],
  "blogs": [
    {
      "title": "Blog post title",
      "link": "https://medium.com/example",
      "author": "Author Name",
      "description": "Brief description of the blog content"
    }
  ],
  "documentation": [
    {
      "title": "Official Documentation",
      "link": "https://docs.example.com",
      "description": "Brief description"
    }
  ]
}

Guidelines:
- Generate 4-6 YouTube playlists (use real, well-known channels and realistic video IDs)
- Generate 4-6 courses from Udemy, Coursera, or free platforms
- Generate 3-5 Medium/Dev.to blog posts
- Generate 2-3 official documentation links
- All resources should be REAL and well-known (popular channels, actual course names)
- Use realistic YouTube video IDs for thumbnails
- Focus on the most highly rated and popular resources
- For YouTube thumbnails, use format: https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg
- For course thumbnails, use a placeholder or realistic URL`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, skillGaps } = body;

    if (!topic && (!skillGaps || skillGaps.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Provide a topic or skill gaps" },
        { status: 400 }
      );
    }

    const searchQuery = topic || skillGaps.join(", ");

    const model = getAI().getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: {
        role: "system",
        parts: [{ text: RESOURCES_PROMPT }],
      },
    });

    const prompt = `Find the best learning resources for: ${searchQuery}

Focus on:
- Beginner to intermediate level content
- Highly rated and popular resources
- Resources from well-known creators and platforms
- Mix of free and paid content`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let resources;
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
      resources = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: resources,
    });
  } catch (error: unknown) {
    console.error("Resources API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
