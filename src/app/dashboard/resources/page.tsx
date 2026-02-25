"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  Sparkles,
  AlertCircle,
  Youtube,
  BookOpen,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import YouTubePlaylist from "@/components/resources/YouTubePlaylist";
import CourseCards from "@/components/resources/CourseCards";
import MediumBlogs from "@/components/resources/MediumBlogs";
import DocLinks from "@/components/resources/DocLinks";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const SUGGESTED_TOPICS = [
  "React & Next.js",
  "Machine Learning",
  "System Design",
  "Docker & Kubernetes",
  "Data Structures & Algorithms",
  "TypeScript",
  "Python",
  "AWS Cloud",
];

export default function ResourcesPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resources, setResources] = useState<any>(null);
  const [skillGaps, setSkillGaps] = useState<string[]>([]);

  // Load skill gaps from audit data on mount
  useEffect(() => {
    fetchSkillGaps();
  }, []);

  const fetchSkillGaps = async () => {
    try {
      const res = await fetch("/api/dashboard/data");
      const json = await res.json();
      if (json.success && json.data?.audit?.atsKeywordAnalysis?.skill_gaps) {
        setSkillGaps(json.data.audit.atsKeywordAnalysis.skill_gaps);
      }
    } catch {
      // Non-critical - skill gaps are optional
    }
  };

  const searchResources = async (topic: string) => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const json = await res.json();
      if (json.success) {
        setResources(json.data);
      } else {
        setError(json.error || "Failed to fetch resources");
      }
    } catch {
      setError("Failed to fetch resources. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchResources(query);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <Badge
          variant="secondary"
          className="mb-2 px-3 py-1 bg-indigo-50 text-indigo-600 border-indigo-100 flex items-center gap-1.5 w-fit"
        >
          <Sparkles className="w-3.5 h-3.5 fill-current" /> AI-Curated Resources
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
          Learning Resources
        </h1>
        <p className="text-gray-500 mt-2 text-lg font-medium">
          Find the best tutorials, courses, and articles for any topic
        </p>
      </motion.div>

      {/* Search */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for any topic (e.g., React, Machine Learning, System Design)"
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none text-gray-900 placeholder-gray-400 font-medium transition-all"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-8 shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </form>
      </motion.div>

      {/* Skill Gap Quick Tags */}
      {!resources && (
        <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-4">
          {skillGaps.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2">
                Based on your skill gaps:
              </p>
              <div className="flex flex-wrap gap-2">
                {skillGaps.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => {
                      setQuery(skill);
                      searchResources(skill);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-sm font-medium transition-colors border border-rose-100"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2">
              Popular topics:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => {
                    setQuery(topic);
                    searchResources(topic);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-sm font-medium transition-colors border border-indigo-100"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">
            Curating the best resources for you...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {resources && !loading && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Summary Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Results for &ldquo;{resources.topic || query}&rdquo;
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {(resources.youtube_playlists?.length || 0) +
                    (resources.courses?.length || 0) +
                    (resources.blogs?.length || 0)}{" "}
                  resources found
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setResources(null);
                  setQuery("");
                }}
                className="text-gray-500"
              >
                Clear
              </Button>
            </div>

            {/* Resource Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                <Youtube className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {resources.youtube_playlists?.length || 0}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    Playlists
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100">
                <BookOpen className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {resources.courses?.length || 0}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    Courses
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <FileText className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-lg font-bold text-gray-900">
                    {resources.blogs?.length || 0}
                  </p>
                  <p className="text-[10px] uppercase font-bold text-gray-400">
                    Articles
                  </p>
                </div>
              </div>
            </div>

            {/* Resource Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {resources.youtube_playlists && (
                <YouTubePlaylist playlists={resources.youtube_playlists} />
              )}
              {resources.courses && (
                <CourseCards courses={resources.courses} />
              )}
              {resources.blogs && (
                <MediumBlogs blogs={resources.blogs} />
              )}
              {resources.documentation && (
                <DocLinks docs={resources.documentation} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!resources && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-6">
            <Search className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Search for any topic
          </h3>
          <p className="text-gray-400 max-w-md">
            Get AI-curated YouTube playlists, online courses, articles, and
            documentation tailored to your learning needs.
          </p>
        </motion.div>
      )}
    </div>
  );
}
