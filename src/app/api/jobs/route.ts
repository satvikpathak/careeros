// ============================================
// CareerOS — Job Search API Route (RapidAPI)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import type { NormalizedJob } from "@/lib/types";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const RAPIDAPI_HOST_JSEARCH = "jsearch.p.rapidapi.com";

type JobsSourceFilter = "all" | "linkedin" | "indeed" | "naukri";

function inferSource(job: Record<string, any>): NormalizedJob["source"] {
  const text = `${job.job_publisher || ""} ${(job.apply_options || [])
    .map((opt: any) => opt?.publisher || "")
    .join(" ")}`.toLowerCase();

  if (text.includes("linkedin")) return "linkedin";
  if (text.includes("indeed")) return "indeed";
  if (text.includes("naukri")) return "naukri";
  return "other";
}

function normalizeJSearchJob(job: Record<string, any>, index: number, location: string): NormalizedJob {
  const source = inferSource(job);

  return {
    id: `jsearch-${job.job_id || index}-${Date.now()}`,
    title: job.job_title || "Unknown",
    company: job.employer_name || "Unknown",
    location: job.job_location || [job.job_city, job.job_state].filter(Boolean).join(", ") || location || "Not specified",
    salary:
      job.job_salary ||
      (job.job_min_salary || job.job_max_salary
        ? `${job.job_min_salary || ""}${job.job_min_salary && job.job_max_salary ? " - " : ""}${job.job_max_salary || ""} ${job.job_salary_period || ""}`.trim()
        : "Not specified"),
    description: job.job_description || "",
    url: job.job_apply_link || job.job_google_link || "#",
    source,
  };
}

// ---- JSearch Jobs Search ----
async function searchJSearch(query: string, location: string, source: JobsSourceFilter): Promise<NormalizedJob[]> {
  try {
    const composedQuery = location ? `${query} in ${location}` : query;

    const params = new URLSearchParams({
      query: composedQuery,
      page: "1",
      num_pages: "1",
      date_posted: "all",
      country: "us",
      language: "en",
    });

    const response = await fetch(
      `https://${RAPIDAPI_HOST_JSEARCH}/search?${params.toString()}`,
      {
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_HOST_JSEARCH,
        },
      }
    );

    if (!response.ok) throw new Error(`JSearch API: ${response.status}`);
    const data = await response.json();

    const rows = Array.isArray(data?.data) ? data.data : [];
    const normalized: NormalizedJob[] = rows.map((job: Record<string, any>, index: number) =>
      normalizeJSearchJob(job, index, location)
    );

    if (source === "all") {
      return normalized.slice(0, 25);
    }

    return normalized.filter((job: NormalizedJob) => job.source === source).slice(0, 25);
  } catch (error) {
    console.error("JSearch error:", error);
    return [];
  }
}

// ---- Generate Mock Jobs (Fallback) ----
function generateMockJobs(query: string, location: string): NormalizedJob[] {
  const companies = [
    "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix",
    "Spotify", "Stripe", "Airbnb", "Uber", "Salesforce", "Adobe",
    "IBM", "Oracle", "Intel", "Nvidia", "Twitter", "LinkedIn",
    "Shopify", "Atlassian",
  ];

  const locations = location
    ? [location]
    : ["San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX", "Remote"];

  return Array.from({ length: 15 }, (_, i) => ({
    id: `mock-${i}-${Date.now()}`,
    title: `${query} ${i % 3 === 0 ? "Senior" : i % 3 === 1 ? "Mid-Level" : "Junior"}`,
    company: companies[i % companies.length],
    location: locations[i % locations.length],
    salary: `$${80 + i * 8}k - $${120 + i * 10}k`,
    description: `We are looking for a talented ${query} to join our team. You will work on cutting-edge projects using modern technologies. Requirements include strong problem-solving skills and experience with relevant tools and frameworks.`,
    url: "#",
    source: (["linkedin", "indeed", "naukri"] as const)[i % 3],
  }));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const location = searchParams.get("location") || "";
  const source = (searchParams.get("source") || "all") as JobsSourceFilter;

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Search query is required" },
        { status: 400 }
      );
    }

    let allJobs: NormalizedJob[] = [];
    const providerStatus: Record<string, "ok" | "failed" | "skipped"> = {
      jsearch: "skipped",
    };
    let fallbackReason: string | null = null;

    if (!RAPIDAPI_KEY || RAPIDAPI_KEY === "your_rapidapi_key_here") {
      // Use mock data when no API key
      allJobs = generateMockJobs(query, location);
      fallbackReason = "RAPIDAPI_KEY missing or placeholder; using mock jobs.";
    } else {
      allJobs = await searchJSearch(query, location, source);
      providerStatus.jsearch = allJobs.length > 0 ? "ok" : "failed";

      // Fallback to mock if no results
      if (allJobs.length === 0) {
        allJobs = generateMockJobs(query, location);
        fallbackReason = "JSearch returned no usable results; using mock jobs.";
      }
    }

    return NextResponse.json({
      success: true,
      data: allJobs,
      total: allJobs.length,
      meta: {
        usingFallback: !!fallbackReason,
        fallbackReason,
        providerStatus,
      },
    });
  } catch (error: unknown) {
    console.error("Job search error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Job search failed",
      },
      { status: 500 }
    );
  }
}
