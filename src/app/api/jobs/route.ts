// ============================================
// CareerOS — Job Search API Route (RapidAPI)
// ============================================

import { NextRequest, NextResponse } from "next/server";
import type { NormalizedJob } from "@/lib/types";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const RAPIDAPI_HOST_LINKEDIN = "linkedin-jobs-search.p.rapidapi.com";
const RAPIDAPI_HOST_INDEED = "indeed12.p.rapidapi.com";

// ---- LinkedIn Jobs Search ----
async function searchLinkedIn(query: string, location: string): Promise<NormalizedJob[]> {
  try {
    const response = await fetch(
      `https://${RAPIDAPI_HOST_LINKEDIN}/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_HOST_LINKEDIN,
        },
        body: JSON.stringify({
          search_terms: query,
          location: location || "United States",
          page: "1",
        }),
      }
    );

    if (!response.ok) throw new Error(`LinkedIn API: ${response.status}`);
    const data = await response.json();

    return (data || []).slice(0, 10).map((job: Record<string, string>, index: number) => ({
      id: `linkedin-${index}-${Date.now()}`,
      title: job.job_title || job.title || "Unknown",
      company: job.company_name || job.company || "Unknown",
      location: job.job_location || job.location || location,
      salary: job.salary || "Not specified",
      description: job.job_description || job.description || "",
      url: job.job_url || job.linkedin_job_url_cleaned || "#",
      source: "linkedin" as const,
    }));
  } catch (error) {
    console.error("LinkedIn search error:", error);
    return [];
  }
}

// ---- Indeed Jobs Search ----
async function searchIndeed(query: string, location: string): Promise<NormalizedJob[]> {
  try {
    const params = new URLSearchParams({
      query: query,
      location: location || "United States",
      page_id: "1",
      locality: "us",
      fromage: "30",
      radius: "50",
    });

    const response = await fetch(
      `https://${RAPIDAPI_HOST_INDEED}/jobs/search?${params}`,
      {
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_HOST_INDEED,
        },
      }
    );

    if (!response.ok) throw new Error(`Indeed API: ${response.status}`);
    const data = await response.json();

    return (data.hits || data.jobs || data || []).slice(0, 10).map(
      (job: Record<string, string>, index: number) => ({
        id: `indeed-${index}-${Date.now()}`,
        title: job.title || "Unknown",
        company: job.company_name || job.company || "Unknown",
        location: job.location || location,
        salary: job.salary || job.extracted_salary?.toString() || "Not specified",
        description: job.description || job.snippet || "",
        url: job.link || job.url || "#",
        source: "indeed" as const,
      })
    );
  } catch (error) {
    console.error("Indeed search error:", error);
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
    const source = searchParams.get("source") || "all";

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Search query is required" },
        { status: 400 }
      );
    }

    let allJobs: NormalizedJob[] = [];

    if (!RAPIDAPI_KEY || RAPIDAPI_KEY === "your_rapidapi_key_here") {
      // Use mock data when no API key
      allJobs = generateMockJobs(query, location);
    } else {
      const searches: Promise<NormalizedJob[]>[] = [];

      if (source === "all" || source === "linkedin") {
        searches.push(searchLinkedIn(query, location));
      }
      if (source === "all" || source === "indeed") {
        searches.push(searchIndeed(query, location));
      }

      const results = await Promise.allSettled(searches);
      allJobs = results
        .filter((r): r is PromiseFulfilledResult<NormalizedJob[]> => r.status === "fulfilled")
        .flatMap((r) => r.value);

      // Fallback to mock if no results
      if (allJobs.length === 0) {
        allJobs = generateMockJobs(query, location);
      }
    }

    return NextResponse.json({
      success: true,
      data: allJobs,
      total: allJobs.length,
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
