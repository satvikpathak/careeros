// ============================================
// CareerOS 2.0 — Learning Resources API
// Uses Gemini to generate curated resource recommendations
// YouTube playlists use search URLs (always valid, never 404)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getAI } from "@/lib/gemini";

const PLACEHOLDER_HOSTS = new Set([
  "example.com",
  "www.example.com",
  "localhost",
  "127.0.0.1",
]);

const OFFICIAL_DOCS_FALLBACKS: Array<{ keyword: string; title: string; link: string }> = [
  { keyword: "react", title: "React Documentation", link: "https://react.dev/learn" },
  { keyword: "next", title: "Next.js Documentation", link: "https://nextjs.org/docs" },
  { keyword: "typescript", title: "TypeScript Documentation", link: "https://www.typescriptlang.org/docs/" },
  { keyword: "javascript", title: "MDN JavaScript Guide", link: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" },
  { keyword: "python", title: "Python Documentation", link: "https://docs.python.org/3/" },
  { keyword: "node", title: "Node.js Documentation", link: "https://nodejs.org/docs/latest/api/" },
  { keyword: "docker", title: "Docker Documentation", link: "https://docs.docker.com/" },
  { keyword: "kubernetes", title: "Kubernetes Documentation", link: "https://kubernetes.io/docs/" },
  { keyword: "aws", title: "AWS Documentation", link: "https://docs.aws.amazon.com/" },
  { keyword: "azure", title: "Azure Documentation", link: "https://learn.microsoft.com/azure/" },
  { keyword: "gcp", title: "Google Cloud Documentation", link: "https://cloud.google.com/docs" },
  { keyword: "sql", title: "PostgreSQL Documentation", link: "https://www.postgresql.org/docs/" },
  { keyword: "postgres", title: "PostgreSQL Documentation", link: "https://www.postgresql.org/docs/" },
  { keyword: "java", title: "Java Documentation", link: "https://docs.oracle.com/en/java/" },
  { keyword: "go", title: "Go Documentation", link: "https://go.dev/doc/" },
  { keyword: "rust", title: "Rust Documentation", link: "https://doc.rust-lang.org/" },
  { keyword: "machine learning", title: "scikit-learn Documentation", link: "https://scikit-learn.org/stable/user_guide.html" },
];

const reachabilityCache = new Map<string, boolean>();

function normalizeUrl(value?: string): string {
  if (!value) return "";
  let normalized = String(value).trim();
  normalized = normalized.replace(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/i, "$2");
  normalized = normalized.replace(/^['"`]+|['"`]+$/g, "");
  normalized = normalized.replace(/[),.;:!?]+$/g, "");
  if (/^(www\.|medium\.com\/|dev\.to\/|udemy\.com\/|coursera\.org\/)/i.test(normalized)) {
    normalized = `https://${normalized.replace(/^www\./i, "www.")}`;
  }
  return normalized;
}

function isLikelyReachableStatus(status: number): boolean {
  // Accept 2xx/3xx and also 401/403 (often anti-bot protected but valid in browser).
  if (status >= 200 && status < 400) return true;
  if (status === 401 || status === 403) return true;
  return false;
}

function isValidHttpUrl(url?: string): boolean {
  const normalized = normalizeUrl(url);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (PLACEHOLDER_HOSTS.has(parsed.hostname.toLowerCase())) return false;
    return true;
  } catch {
    return false;
  }
}

async function isUrlReachable(url: string): Promise<boolean> {
  const normalized = normalizeUrl(url);
  if (!isValidHttpUrl(normalized)) return false;
  if (reachabilityCache.has(normalized)) return reachabilityCache.get(normalized)!;

  try {
    const head = await fetch(normalized, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
    });

    const ok = isLikelyReachableStatus(head.status);
    reachabilityCache.set(normalized, ok);
    return ok;
  } catch {
    try {
      const get = await fetch(normalized, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      const ok = isLikelyReachableStatus(get.status);
      reachabilityCache.set(normalized, ok);
      return ok;
    } catch {
      reachabilityCache.set(normalized, false);
      return false;
    }
  }
}

function buildCourseFallbackLink(platform: string, title: string, query: string): string {
  const searchTerm = encodeURIComponent(`${title || query} course`);
  const platformLower = platform.toLowerCase();

  if (platformLower.includes("udemy")) {
    return `https://www.udemy.com/courses/search/?q=${searchTerm}`;
  }
  if (platformLower.includes("coursera")) {
    return `https://www.coursera.org/search?query=${searchTerm}`;
  }
  if (platformLower.includes("edx")) {
    return `https://www.edx.org/search?q=${searchTerm}`;
  }

  return `https://www.coursera.org/search?query=${searchTerm}`;
}

function buildBlogFallbackLink(title: string, topic: string): string {
  const query = encodeURIComponent(`${title || topic} tutorial`);
  return `https://medium.com/search?q=${query}`;
}

function getDocumentationFallback(candidate: string, query: string): { title: string; link: string } {
  const haystack = `${candidate} ${query}`.toLowerCase();
  const match = OFFICIAL_DOCS_FALLBACKS.find((entry) => haystack.includes(entry.keyword));

  if (match) {
    return { title: match.title, link: match.link };
  }

  return {
    title: "MDN Web Docs",
    link: "https://developer.mozilla.org/",
  };
}

async function sanitizeResources(data: any, query: string) {
  const topic = typeof data?.topic === "string" && data.topic.trim() ? data.topic.trim() : query;

  const youtube_playlists = Array.isArray(data?.youtube_playlists)
    ? data.youtube_playlists
        .map((pl: any) => {
          const searchQuery = String(pl?.search_query || pl?.title || topic || "learning").trim();
          const encodedQuery = encodeURIComponent(searchQuery);

          let link = String(pl?.link || "").trim();
          if (!link.includes("youtube.com/results?search_query=") && !link.includes("youtube.com/watch")) {
            link = `https://www.youtube.com/results?search_query=${encodedQuery}+playlist`;
          }

          if (!isValidHttpUrl(link) || !link.includes("youtube.com")) return null;

          return {
            title: String(pl?.title || searchQuery || "YouTube Learning Playlist").trim(),
            link,
            thumbnail: isValidHttpUrl(pl?.thumbnail) ? String(pl.thumbnail).trim() : "",
            channel: String(pl?.channel || "YouTube").trim(),
            video_count: String(pl?.video_count || "Playlist").trim(),
            description: String(pl?.description || "Curated YouTube resources for this topic.").trim(),
            search_query: searchQuery,
          };
        })
        .filter(Boolean)
    : [];

  const courses = Array.isArray(data?.courses)
    ? (
        await Promise.all(
          data.courses.map(async (course: any) => {
            const name = String(course?.name || "Untitled Course").trim();
            const rawLink = normalizeUrl(course?.registrationLink);
            const inferredPlatform = rawLink.includes("udemy.com")
              ? "Udemy"
              : rawLink.includes("coursera.org")
                ? "Coursera"
                : rawLink.includes("edx.org")
                  ? "edX"
                  : "Online";
            const platform = String(course?.platform || inferredPlatform).trim();

            let registrationLink = isValidHttpUrl(rawLink) ? rawLink : "";
            if (!registrationLink || !(await isUrlReachable(registrationLink))) {
              registrationLink = buildCourseFallbackLink(platform, name, topic);
            }

            return {
              name,
              registrationLink,
              description: String(course?.description || "Recommended course for this topic.").trim(),
              rating: Number.isFinite(Number(course?.rating)) ? Math.max(0, Math.min(5, Number(course.rating))) : 4.5,
              thumbnail: isValidHttpUrl(course?.thumbnail) ? normalizeUrl(course.thumbnail) : "",
              workload: String(course?.workload || "Self-paced").trim(),
              platform,
            };
          })
        )
      ).filter(Boolean)
    : [];

  const blogs = Array.isArray(data?.blogs)
    ? (
        await Promise.all(
          data.blogs.map(async (blog: any) => {
            const title = String(blog?.title || "Learning Article").trim();
            const author = String(blog?.author || "Unknown Author").trim();
            const description = String(blog?.description || "Helpful article for this learning topic.").trim();
            const rawLink = normalizeUrl(blog?.link);

            let link = isValidHttpUrl(rawLink) ? rawLink : "";

            const looksLikeMedium = /medium\.com/i.test(rawLink) || /medium/i.test(author);
            if (!link || !(await isUrlReachable(link))) {
              link = looksLikeMedium
                ? buildBlogFallbackLink(title, topic)
                : `https://dev.to/search?q=${encodeURIComponent(title || topic)}`;
            }

            return {
              title,
              link,
              author,
              description,
            };
          })
        )
      )
        .filter(Boolean)
        .filter((blog, index, arr) => arr.findIndex((item) => item.link === blog.link) === index)
    : [];

  const documentation = Array.isArray(data?.documentation)
    ? (
        await Promise.all(
          data.documentation.map(async (doc: any) => {
            const rawTitle = String(doc?.title || "Official Documentation").trim();
            const rawDescription = String(doc?.description || "Authoritative official reference.").trim();
            const rawLink = normalizeUrl(doc?.link);

            let title = rawTitle;
            let link = isValidHttpUrl(rawLink) ? rawLink : "";

            if (!link || !(await isUrlReachable(link))) {
              const fallback = getDocumentationFallback(`${rawTitle} ${rawDescription}`, topic);
              title = fallback.title;
              link = fallback.link;
            }

            return {
              title,
              link,
              description: rawDescription,
            };
          })
        )
      )
        .filter(Boolean)
        .filter((doc, index, arr) => arr.findIndex((item) => item.link === doc.link) === index)
    : [];

  return {
    topic,
    youtube_playlists,
    courses,
    blogs,
    documentation,
  };
}

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

  resources = await sanitizeResources(resources, searchQuery);

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
