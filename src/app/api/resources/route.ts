// ============================================
// CareerOS 2.0 — Learning Resources API
// Uses Gemini to generate curated resource recommendations
// YouTube playlists use search URLs (always valid, never 404)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAI } from "@/lib/gemini";

const RESOURCES_PROMPT = `You are a learning resource curator for CareerOS 2.0.
Given a topic or list of skill gaps, generate curated learning resources.

CRITICAL RULES FOR YOUTUBE:
- For youtube_playlists, you must ONLY use YouTube search URLs in this format:
  https://www.youtube.com/results?search_query=TOPIC+playlist
- For thumbnails, use: https://img.youtube.com/vi/default/maxresdefault.jpg
- Use REAL well-known channel names but DO NOT fabricate playlist IDs or video IDs
- The search_query should be URL-encoded and specific to find the best playlist

OUTPUT: Return EXACTLY this JSON:
{
  "topic": "The topic searched for",
  "youtube_playlists": [
    {
      "title": "Descriptive playlist title",
      "link": "https://www.youtube.com/results?search_query=react+tutorial+playlist+freecodecamp",
      "thumbnail": "",
      "channel": "Recommended Channel Name",
      "video_count": "Estimated video count",
      "description": "Brief description of what to search for",
      "search_query": "react tutorial playlist freecodecamp"
    }
  ],
  "courses": [
    {
      "name": "Course title (must be a REAL course that exists)",
      "registrationLink": "https://www.udemy.com/course/REAL-SLUG/ or https://www.coursera.org/learn/REAL-SLUG",
      "description": "Brief course description",
      "rating": 4.5,
      "thumbnail": "",
      "workload": "40 hours total",
      "platform": "Udemy"
    }
  ],
  "blogs": [
    {
      "title": "Blog post title",
      "link": "https://medium.com/example or https://dev.to/example",
      "author": "Author Name",
      "description": "Brief description of the blog content"
    }
  ],
  "documentation": [
    {
      "title": "Official Documentation",
      "link": "https://docs.example.com (must be REAL official docs URL)",
      "description": "Brief description"
    }
  ]
}

Guidelines:
- Generate 4-6 YouTube search queries (use real channel names as hints)
- Generate 4-6 courses — use REAL course slugs from Udemy/Coursera that actually exist
- Generate 3-5 blog posts from Medium or Dev.to
- Generate 2-3 official documentation links (must be real URLs)
- ALL links must be to REAL pages that exist
- For courses, use actual course URL slugs you are confident about`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, skillGaps, phaseTopics } = body;

    if (!topic && (!skillGaps || skillGaps.length === 0) && !phaseTopics) {
      return NextResponse.json(
        { success: false, error: "Provide a topic, skill gaps, or phase topics" },
        { status: 400 }
      );
    }

    const searchQuery = phaseTopics || topic || skillGaps.join(", ");

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
- ONLY use YouTube search URLs, never fabricated playlist/video IDs
- Only recommend Udemy/Coursera courses that ACTUALLY EXIST with real URL slugs`;

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

    // Post-process YouTube playlists to ensure valid search URLs
    if (resources.youtube_playlists) {
      resources.youtube_playlists = resources.youtube_playlists.map((pl: any) => {
        // If the link is NOT a search URL, convert it to one
        if (!pl.link?.includes("youtube.com/results?search_query=")) {
          const query = encodeURIComponent(pl.search_query || pl.title + " playlist");
          pl.link = `https://www.youtube.com/results?search_query=${query}`;
        }
        // Set a fallback thumbnail (YouTube red play button icon)
        if (!pl.thumbnail || pl.thumbnail.includes("default/maxresdefault")) {
          pl.thumbnail = "";
        }
        return pl;
      });
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
