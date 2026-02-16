"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ExternalLink,
  Play,
  GraduationCap,
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  ChevronUp,
  Compass,
  Loader2,
  Sparkles,
  Youtube,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { usePathfinderStore } from "@/stores/pathfinder-store";
import type { LearningResource, RoadmapMilestone } from "@/lib/types";
import Link from "next/link";

export default function RoadmapPage() {
  const { analysis, roadmap, setRoadmap, isLoadingResources, setLoadingResources } =
    usePathfinderStore();

  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(
    new Set()
  );
  const [selectedCareer, setSelectedCareer] = useState<string>("");

  // Fetch resources when analysis is available but roadmap is not yet loaded
  const fetchResources = useCallback(
    async (careerTitle: string, skills: string[]) => {
      setLoadingResources(true);
      try {
        const response = await fetch("/api/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ careerTitle, skills }),
        });

        const data = await response.json();

        if (data.success) {
          const resources: LearningResource[] = (data.data.resources || []).map(
            (r: LearningResource) => ({
              id: r.id,
              title: r.title,
              url: r.url,
              source: r.source,
              thumbnail: r.thumbnail || "",
              channel: r.channel || "",
              description: r.description || "",
            })
          );

          // Build milestones from analysis roadmap + fetched resources
          const phases = analysis?.roadmap || [];
          const resourcesPerPhase = Math.max(
            2,
            Math.floor(resources.length / Math.max(phases.length, 1))
          );

          const milestones: RoadmapMilestone[] = phases.map((phase, i) => ({
            id: `milestone-${phase.phase}`,
            phase: phase.phase,
            title: phase.title,
            description: phase.description,
            duration: phase.duration,
            skills: phase.skills_to_learn,
            resources: resources.slice(
              i * resourcesPerPhase,
              (i + 1) * resourcesPerPhase
            ),
            isCompleted: false,
          }));

          setRoadmap({
            career_title: careerTitle,
            milestones,
          });
        }
      } catch (error) {
        console.error("Failed to fetch resources:", error);
      } finally {
        setLoadingResources(false);
      }
    },
    [analysis, setRoadmap, setLoadingResources]
  );

  useEffect(() => {
    if (analysis && !roadmap && !isLoadingResources) {
      const topCareer = analysis.recommended_careers[0];
      if (topCareer) {
        setSelectedCareer(topCareer.title);
        const allSkills = analysis.roadmap.flatMap((r) => r.skills_to_learn);
        const uniqueSkills = [...new Set(allSkills)];
        fetchResources(topCareer.title, uniqueSkills);
      }
    }
  }, [analysis, roadmap, isLoadingResources, fetchResources]);

  const toggleMilestone = (id: string) => {
    setCompletedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const overallProgress = roadmap
    ? Math.round(
        (completedMilestones.size / Math.max(roadmap.milestones.length, 1)) *
          100
      )
    : 0;

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "youtube":
        return <Youtube className="w-4 h-4 text-red-500" />;
      case "coursera":
        return <GraduationCap className="w-4 h-4 text-blue-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "youtube":
        return "bg-red-50 text-red-700 border-red-200";
      case "coursera":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "udemy":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "freecodecamp":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // ---- Empty State: No analysis yet ----
  if (!analysis) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-6">
            <Compass className="w-10 h-10 text-indigo-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            No Roadmap Yet
          </h1>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Complete the Career Pathfinder first to generate your personalized
            learning roadmap with curated resources.
          </p>
          <Button
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
            asChild
          >
            <Link href="/dashboard/pathfinder">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Career Pathfinder
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  // ---- Loading State ----
  if (isLoadingResources) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">
            Building Your Roadmap
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Finding the best YouTube playlists, Coursera courses, and free
            resources for your career path...
          </p>
          <div className="flex justify-center gap-3 pt-2">
            {["YouTube", "Coursera", "Free Resources"].map((source, i) => (
              <motion.div
                key={source}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.2 }}
              >
                <Badge variant="outline" className="text-xs">
                  {source}
                </Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              Learning Roadmap
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {roadmap?.career_title
                ? `Personalized path to becoming a ${roadmap.career_title}`
                : "Your personalized learning journey"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Career Selector */}
            {analysis.recommended_careers.length > 1 && (
              <div className="flex gap-1.5">
                {analysis.recommended_careers.slice(0, 3).map((career) => (
                  <Button
                    key={career.title}
                    variant={
                      selectedCareer === career.title ? "default" : "outline"
                    }
                    size="sm"
                    className={
                      selectedCareer === career.title
                        ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                        : "glass-card text-xs"
                    }
                    onClick={() => {
                      setSelectedCareer(career.title);
                      const allSkills = analysis.roadmap.flatMap(
                        (r) => r.skills_to_learn
                      );
                      fetchResources(career.title, [...new Set(allSkills)]);
                    }}
                  >
                    {career.title}
                  </Button>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="glass-card"
              onClick={() => {
                const allSkills = analysis.roadmap.flatMap(
                  (r) => r.skills_to_learn
                );
                fetchResources(selectedCareer, [...new Set(allSkills)]);
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Overall Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="glass-card border-0 mb-6">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Overall Progress
              </span>
              <span className="text-sm font-bold text-indigo-600">
                {overallProgress}%
              </span>
            </div>
            <Progress value={overallProgress} className="h-2.5" />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span>
                {completedMilestones.size} of{" "}
                {roadmap?.milestones.length || 0} milestones completed
              </span>
              <span>
                {roadmap?.milestones.reduce(
                  (sum, m) => sum + m.resources.length,
                  0
                ) || 0}{" "}
                resources curated
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Milestone Timeline */}
      <div className="space-y-4">
        {(roadmap?.milestones || []).map((milestone, i) => {
          const isExpanded = expandedPhase === i;
          const isCompleted = completedMilestones.has(milestone.id);

          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
            >
              <Card
                className={`border-0 transition-all duration-200 ${
                  isCompleted
                    ? "bg-emerald-50/50 ring-1 ring-emerald-200"
                    : "glass-card"
                }`}
              >
                <CardContent className="p-0">
                  {/* Milestone Header */}
                  <button
                    className="w-full p-5 flex items-center gap-4 text-left"
                    onClick={() =>
                      setExpandedPhase(isExpanded ? null : i)
                    }
                  >
                    {/* Phase Number / Check */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        isCompleted
                          ? "bg-emerald-500"
                          : "bg-gradient-to-br from-indigo-500 to-purple-600"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-white" />
                      ) : (
                        <span className="text-lg font-bold text-white">
                          {milestone.phase}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`text-base font-semibold ${
                            isCompleted
                              ? "text-emerald-700"
                              : "text-gray-900"
                          }`}
                        >
                          {milestone.title}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {milestone.duration}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {milestone.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {milestone.skills.slice(0, 5).map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {milestone.skills.length > 5 && (
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                          >
                            +{milestone.skills.length - 5}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Mark complete button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMilestone(milestone.id);
                        }}
                        className={
                          isCompleted
                            ? "text-emerald-600 hover:text-emerald-700"
                            : "text-gray-400 hover:text-gray-600"
                        }
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <Separator />
                        <div className="p-5 space-y-4">
                          <p className="text-sm text-gray-600">
                            {milestone.description}
                          </p>

                          {/* Resources Grid */}
                          {milestone.resources.length > 0 ? (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Play className="w-4 h-4 text-indigo-500" />
                                Learning Resources ({milestone.resources.length}
                                )
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {milestone.resources.map((resource) => (
                                  <a
                                    key={resource.id}
                                    href={resource.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all"
                                  >
                                    {/* Thumbnail */}
                                    {resource.thumbnail ? (
                                      <div className="w-20 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                                        <img
                                          src={resource.thumbnail}
                                          alt={resource.title}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-20 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                        {getSourceIcon(resource.source)}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h5 className="text-xs font-medium text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                        {resource.title}
                                      </h5>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                          variant="outline"
                                          className={`text-[9px] ${getSourceColor(resource.source)}`}
                                        >
                                          {resource.source}
                                        </Badge>
                                        {resource.channel && (
                                          <span className="text-[10px] text-gray-400 truncate">
                                            {resource.channel}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-400 shrink-0 mt-1" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-6 text-gray-400 text-sm">
                              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              No resources loaded yet for this phase.
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center pt-8 pb-4"
      >
        <Button
          variant="outline"
          className="glass-card"
          asChild
        >
          <Link href="/dashboard/pathfinder">
            <Compass className="w-4 h-4 mr-2" />
            Retake Career Pathfinder
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
