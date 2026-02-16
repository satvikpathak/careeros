// ============================================
// CareerOS — Resources API Route
// Fetches YouTube playlists & Coursera courses
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { findResourcesWithGemini } from "@/lib/gemini";

interface YouTubeSearchResult {
  id: { videoId?: string; playlistId?: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: { medium?: { url: string } };
    channelTitle: string;
  };
}

// ---- YouTube Search (via Data API or fallback) ----

async function searchYouTube(query: string): Promise<YouTubeSearchResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    try {
      const params = new URLSearchParams({
        part: "snippet",
        q: query,
        type: "playlist,video",
        maxResults: "5",
        relevanceLanguage: "en",
        key: apiKey,
      });

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${params}`,
        { next: { revalidate: 86400 } } // cache 24h
      );

      if (res.ok) {
        const data = await res.json();
        return data.items || [];
      }
    } catch (error) {
      console.error("YouTube API error:", error);
    }
  }

  // Return empty — will use Gemini-generated fallback
  return [];
}

// ---- Coursera Catalog Search (public endpoint) ----

async function searchCoursera(keyword: string): Promise<
  { name: string; slug: string; partnerName: string; photoUrl: string }[]
> {
  try {
    const params = new URLSearchParams({
      q: "search",
      query: keyword,
      limit: "5",
      fields: "name,slug,partnerIds,photoUrl",
    });

    const res = await fetch(
      `https://api.coursera.org/api/courses.v1?${params}`,
      { next: { revalidate: 86400 } }
    );

    if (res.ok) {
      const data = await res.json();
      return (data.elements || []).map(
        (c: { name: string; slug: string; photoUrl?: string }) => ({
          name: c.name,
          slug: c.slug,
          partnerName: "Coursera",
          photoUrl: c.photoUrl || "",
        })
      );
    }
  } catch (error) {
    console.error("Coursera API error:", error);
  }
  return [];
}

// ---- POST Handler ----

export async function POST(req: NextRequest) {
  try {
    const { careerTitle, skills } = await req.json();

    if (!careerTitle || !skills) {
      return NextResponse.json(
        { success: false, error: "careerTitle and skills are required" },
        { status: 400 }
      );
    }

    // 1. Get resource suggestions from Gemini
    const geminiResponse = await findResourcesWithGemini(careerTitle, skills);

    let resourcePlan: {
      youtube_queries: string[];
      coursera_keywords: string[];
      free_resources: { title: string; url: string; source: string; description: string }[];
      learning_path_summary: string;
    };

    try {
      const jsonMatch = geminiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
        geminiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch
        ? jsonMatch[1] || jsonMatch[0]
        : geminiResponse;
      resourcePlan = JSON.parse(jsonStr);
    } catch {
      resourcePlan = {
        youtube_queries: [
          `${careerTitle} roadmap for beginners`,
          `${careerTitle} tutorial playlist`,
          `learn ${skills[0]} complete course`,
          `${careerTitle} career guide`,
        ],
        coursera_keywords: [careerTitle, ...skills.slice(0, 3)],
        free_resources: [],
        learning_path_summary: `Start by building foundational skills in ${skills.slice(0, 3).join(", ")}, then progress to advanced topics.`,
      };
    }

    // 2. Fetch YouTube results for each query
    const youtubeResults = await Promise.all(
      (resourcePlan.youtube_queries || []).slice(0, 6).map(async (query: string) => {
        const results = await searchYouTube(query);
        return results.map((item) => ({
          id: `yt-${item.id.playlistId || item.id.videoId || Math.random().toString(36).slice(2)}`,
          title: item.snippet.title,
          url: item.id.playlistId
            ? `https://www.youtube.com/playlist?list=${item.id.playlistId}`
            : `https://www.youtube.com/watch?v=${item.id.videoId}`,
          source: "youtube" as const,
          thumbnail: item.snippet.thumbnails?.medium?.url || "",
          channel: item.snippet.channelTitle,
          description: item.snippet.description.slice(0, 150),
        }));
      })
    );

    // 3. Fetch Coursera results
    const courseraResults = await Promise.all(
      (resourcePlan.coursera_keywords || []).slice(0, 4).map(async (keyword: string) => {
        const courses = await searchCoursera(keyword);
        return courses.map((c) => ({
          id: `coursera-${c.slug}`,
          title: c.name,
          url: `https://www.coursera.org/learn/${c.slug}`,
          source: "coursera" as const,
          thumbnail: c.photoUrl,
          channel: c.partnerName,
          description: "",
        }));
      })
    );

    // 4. Combine & deduplicate
    const allYoutube = youtubeResults.flat();
    const allCoursera = courseraResults.flat();
    const seenTitles = new Set<string>();
    const dedupedResources = [...allYoutube, ...allCoursera].filter((r) => {
      const key = r.title.toLowerCase();
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    // 5. Add Gemini free_resources
    const freeResources = (resourcePlan.free_resources || []).map(
      (r: { title: string; url: string; source: string; description: string }) => ({
        id: `free-${Math.random().toString(36).slice(2)}`,
        title: r.title,
        url: r.url,
        source: r.source || "other",
        thumbnail: "",
        channel: "",
        description: r.description,
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        resources: [...dedupedResources, ...freeResources],
        learning_path_summary: resourcePlan.learning_path_summary,
        youtube_count: allYoutube.length,
        coursera_count: allCoursera.length,
      },
    });
  } catch (error: unknown) {
    console.error("Resources API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
