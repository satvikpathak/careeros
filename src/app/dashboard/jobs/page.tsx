"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Briefcase,
  Building2,
  ExternalLink,
  Loader2,
  Filter,
  TrendingUp,
  DollarSign,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobsStore } from "@/stores/jobs-store";
import { useProfileStore } from "@/stores/profile-store";
import type { NormalizedJob } from "@/lib/types";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const sourceColors: Record<string, string> = {
  linkedin: "bg-blue-100 text-blue-700",
  indeed: "bg-purple-100 text-purple-700",
  naukri: "bg-emerald-100 text-emerald-700",
  other: "bg-gray-100 text-gray-700",
};

export default function JobsPage() {
  const {
    jobs,
    isSearching,
    isMatching,
    searchQuery,
    searchLocation,
    selectedSource,
    setJobs,
    setSearching,
    setMatching,
    setSearchQuery,
    setSearchLocation,
    setSelectedSource,
  } = useJobsStore();

  const { parsedResume } = useProfileStore();
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [showFilters, setShowFilters] = useState(false);

  const searchJobs = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);

    try {
      const params = new URLSearchParams({
        query: searchQuery,
        location: searchLocation,
        source: selectedSource,
      });

      const response = await fetch(`/api/jobs?${params}`);
      const data = await response.json();

      if (data.success) {
        setJobs(data.data);
      }
    } catch {
      console.error("Job search failed");
    } finally {
      setSearching(false);
    }
  };

  const matchJobs = async () => {
    if (!parsedResume || jobs.length === 0) return;
    setMatching(true);

    try {
      const resumeText = `${parsedResume.skills.join(", ")} ${parsedResume.summary || ""} ${parsedResume.experience_years} years experience`;

      const response = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobs: jobs.map((j) => ({
            id: j.id,
            title: j.title,
            description: j.description,
            company: j.company,
          })),
        }),
      });

      const data = await response.json();
      if (data.success) {
        const scores: Record<string, number> = {};
        data.data.forEach((m: { job_id: string; match_score: number }) => {
          scores[m.job_id] = Math.round(m.match_score * 100);
        });
        setMatchScores(scores);
      }
    } catch {
      console.error("Matching failed");
    } finally {
      setMatching(false);
    }
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    const scoreA = matchScores[a.id] || 0;
    const scoreB = matchScores[b.id] || 0;
    return scoreB - scoreA;
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") searchJobs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <h1 className="text-2xl font-bold text-gray-900">Job Matches</h1>
        <p className="text-sm text-gray-500 mt-1">
          Search and match jobs from LinkedIn, Indeed, and Naukri
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Job title, skills, or keywords..."
                  className="pl-10 bg-gray-50 border-0 focus-visible:ring-1 focus-visible:ring-indigo-200"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Location..."
                  className="pl-10 bg-gray-50 border-0 focus-visible:ring-1 focus-visible:ring-indigo-200 w-full sm:w-48"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={searchJobs}
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white border-0"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span className="ml-1.5">Search</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="glass-card"
                >
                  <Filter className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 mt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-400">Source:</span>
                    {(["all", "linkedin", "indeed", "naukri"] as const).map((source) => (
                      <button
                        key={source}
                        onClick={() => setSelectedSource(source)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          selectedSource === source
                            ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {source.charAt(0).toUpperCase() + source.slice(1)}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Match Button */}
      {parsedResume && jobs.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeIn}>
          <Button
            onClick={matchJobs}
            disabled={isMatching}
            variant="outline"
            className="glass-card"
          >
            {isMatching ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1.5 text-indigo-500" />
            )}
            {isMatching ? "Computing matches..." : "AI Match with Resume"}
          </Button>
        </motion.div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {isSearching ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="glass-card border-0">
              <CardContent className="p-5">
                <div className="flex gap-4">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : sortedJobs.length > 0 ? (
          <AnimatePresence>
            {sortedJobs.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="glass-card border-0 hover:shadow-md transition-all duration-200 group">
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      {/* Company icon */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Building2 className="w-5 h-5 text-gray-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {job.title}
                            </h3>
                            <p className="text-sm text-gray-500">{job.company}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {matchScores[job.id] !== undefined && (
                              <Badge
                                variant={matchScores[job.id] >= 70 ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {matchScores[job.id]}% match
                              </Badge>
                            )}
                            <Badge className={`text-[10px] ${sourceColors[job.source]}`}>
                              {job.source}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {job.location}
                            </span>
                          )}
                          {job.salary && job.salary !== "Not specified" && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" /> {job.salary}
                            </span>
                          )}
                        </div>

                        {job.description && (
                          <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                            {job.description}
                          </p>
                        )}
                      </div>

                      {/* Apply button */}
                      {job.url && job.url !== "#" && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 self-center"
                        >
                          <Button variant="outline" size="sm" className="glass-card text-xs gap-1">
                            Apply <ExternalLink className="w-3 h-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : jobs.length === 0 && !isSearching ? (
          <div className="text-center py-20">
            <Briefcase className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Search for jobs</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Enter a job title or keywords above to search across LinkedIn, Indeed, and Naukri.
              {!parsedResume && " Upload your resume first for AI-powered matching."}
            </p>
          </div>
        ) : null}
      </div>

      {/* Results count */}
      {jobs.length > 0 && !isSearching && (
        <p className="text-xs text-gray-400 text-center">
          Showing {sortedJobs.length} jobs
          {Object.keys(matchScores).length > 0 && " • Sorted by match score"}
        </p>
      )}
    </div>
  );
}
