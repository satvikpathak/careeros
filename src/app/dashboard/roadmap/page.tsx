"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Search,
  Download,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface RoadmapStep {
  phase: string;
  description?: string;
  topics: string[];
  projects?: string[];
  milestones?: string[];
}

interface Roadmap {
  title: string;
  estimated_duration?: string;
  difficulty?: string;
  steps: RoadmapStep[];
}

const SUGGESTED_ROADMAPS = [
  "Full Stack Web Development",
  "Machine Learning Engineer",
  "DevOps & Cloud Engineering",
  "Mobile App Development",
  "Data Science & Analytics",
  "Cybersecurity",
  "Blockchain Development",
  "AI/ML with Python",
];

export default function RoadmapPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({});
  const [completedPhases, setCompletedPhases] = useState<Record<number, boolean>>({});
  const [skillGaps, setSkillGaps] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);

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
      // Non-critical
    }
  };

  const generateRoadmap = async (topic: string) => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setRoadmap(null);
    setVisibleCount(0);
    setExpandedPhases({});
    setCompletedPhases({});

    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const json = await res.json();
      if (json.success) {
        setRoadmap(json.data);
        // Animate phases appearing one by one
        for (let i = 0; i <= json.data.steps.length; i++) {
          setTimeout(() => setVisibleCount(i + 1), i * 300);
        }
        // Auto-expand first phase
        setExpandedPhases({ 0: true });
      } else {
        setError(json.error || "Failed to generate roadmap");
      }
    } catch {
      setError("Failed to generate roadmap. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateRoadmap(query);
  };

  const togglePhase = (index: number) => {
    setExpandedPhases((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const togglePhaseComplete = (index: number) => {
    setCompletedPhases((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <Badge
          variant="secondary"
          className="mb-2 px-3 py-1 bg-indigo-50 text-indigo-600 border-indigo-100 flex items-center gap-1.5 w-fit"
        >
          <Sparkles className="w-3.5 h-3.5 fill-current" /> AI-Powered Roadmaps
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
          Learning Roadmap
        </h1>
        <p className="text-gray-500 mt-2 text-lg font-medium">
          Generate a step-by-step learning path for any technology or career
        </p>
      </motion.div>

      {/* Search */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter a topic (e.g., Machine Learning, Web Development, System Design)"
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none text-gray-900 placeholder-gray-400 font-medium transition-all"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-8 shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate"}
          </Button>
        </form>
      </motion.div>

      {/* Suggestions */}
      {!roadmap && !loading && (
        <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-4">
          {skillGaps.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2">
                Close your skill gaps:
              </p>
              <div className="flex flex-wrap gap-2">
                {skillGaps.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => {
                      setQuery(skill);
                      generateRoadmap(skill);
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
              Popular roadmaps:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_ROADMAPS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => {
                    setQuery(topic);
                    generateRoadmap(topic);
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

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">
            Generating your personalized roadmap...
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

      {/* Roadmap Display */}
      <AnimatePresence mode="wait">
        {roadmap && !loading && (
          <motion.div
            key="roadmap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Title Card */}
            <Card className="glass-premium border-0 shadow-xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-black text-gray-900">
                      {roadmap.title}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-3">
                      {roadmap.estimated_duration && (
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-indigo-100">
                          ⏱ {roadmap.estimated_duration}
                        </Badge>
                      )}
                      {roadmap.difficulty && (
                        <Badge variant="secondary" className="bg-purple-50 text-purple-600 border-purple-100">
                          📊 {roadmap.difficulty}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="bg-gray-50 text-gray-600 border-gray-100">
                        {roadmap.steps.length} Phases
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRoadmap(null);
                        setQuery("");
                      }}
                      className="text-gray-500"
                    >
                      New Roadmap
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Progress */}
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{
                        width: `${
                          (Object.values(completedPhases).filter(Boolean).length /
                            roadmap.steps.length) *
                          100
                        }%`,
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-600">
                    {Object.values(completedPhases).filter(Boolean).length}/
                    {roadmap.steps.length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Phases */}
            <div className="space-y-4">
              {roadmap.steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={
                    visibleCount > index ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }
                  }
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card
                    className={`border-0 shadow-lg transition-all duration-300 overflow-hidden ${
                      completedPhases[index]
                        ? "bg-emerald-50/50 border-emerald-100"
                        : "glass-card hover:shadow-xl"
                    }`}
                  >
                    {/* Phase Header */}
                    <div
                      className="flex items-center gap-4 p-5 cursor-pointer group"
                      onClick={() => togglePhase(index)}
                    >
                      {/* Step Number */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePhaseComplete(index);
                        }}
                        className="flex-shrink-0"
                      >
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            completedPhases[index]
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200"
                          }`}
                        >
                          {completedPhases[index] ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <span className="font-bold text-sm">{index + 1}</span>
                          )}
                        </div>
                      </button>

                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-lg font-bold ${
                            completedPhases[index]
                              ? "text-emerald-700 line-through"
                              : "text-gray-900"
                          }`}
                        >
                          {step.phase}
                        </h3>
                        {step.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                            {step.description}
                          </p>
                        )}
                      </div>

                      <div className="text-gray-400 transition-transform duration-200">
                        {expandedPhases[index] ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {expandedPhases[index] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-0 ml-14 space-y-4">
                            {/* Topics */}
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                Topics to Learn
                              </h4>
                              <ul className="space-y-2">
                                {step.topics.map((topic, ti) => (
                                  <li
                                    key={ti}
                                    className="flex items-start gap-2 text-sm text-gray-700"
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                                    {topic}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Projects */}
                            {step.projects && step.projects.length > 0 && (
                              <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3">
                                  🛠 Projects
                                </h4>
                                <ul className="space-y-1.5">
                                  {step.projects.map((project, pi) => (
                                    <li
                                      key={pi}
                                      className="text-sm text-purple-700 font-medium"
                                    >
                                      • {project}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Milestones */}
                            {step.milestones && step.milestones.length > 0 && (
                              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
                                  🎯 Milestones
                                </h4>
                                <ul className="space-y-1.5">
                                  {step.milestones.map((milestone, mi) => (
                                    <li
                                      key={mi}
                                      className="text-sm text-emerald-700 font-medium"
                                    >
                                      ✓ {milestone}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>

                  {/* Connector Line */}
                  {index < roadmap.steps.length - 1 && visibleCount > index && (
                    <div className="flex justify-start ml-[29px]">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 16 }}
                        transition={{ duration: 0.3 }}
                        className="w-0.5 bg-gradient-to-b from-indigo-300 to-purple-300"
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {!roadmap && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-6">
            <MapPin className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Generate a Learning Roadmap
          </h3>
          <p className="text-gray-400 max-w-md">
            Enter any technology or career path to get a structured, phase-by-phase learning roadmap
            with topics, projects, and milestones.
          </p>
        </motion.div>
      )}
    </div>
  );
}
