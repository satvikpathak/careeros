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
  MapPin,
  BookOpen,
  Brain,
  Youtube,
  FileText,
  ExternalLink,
  Trophy,
  X,
  ArrowRight,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRoadmapStore, type QuizQuestion, type QuizResult } from "@/stores/roadmap-store";
import Link from "next/link";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

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

// ---- Quiz Modal Component ----
function QuizModal({
  questions,
  phaseIndex,
  phaseName,
  existingResult,
  onClose,
  onSubmit,
}: {
  questions: QuizQuestion[];
  phaseIndex: number;
  phaseName: string;
  existingResult?: QuizResult;
  onClose: () => void;
  onSubmit: (result: QuizResult) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>(existingResult?.answers || {});
  const [submitted, setSubmitted] = useState(!!existingResult);
  const [currentQ, setCurrentQ] = useState(0);

  const handleAnswer = (qId: string, optIndex: number) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qId]: optIndex }));
  };

  const handleSubmit = () => {
    const score = questions.reduce((acc, q) => {
      return acc + (answers[q.id] === q.correct ? 1 : 0);
    }, 0);
    const result: QuizResult = {
      phaseIndex,
      score,
      total: questions.length,
      answers,
      completedAt: new Date().toISOString(),
    };
    setSubmitted(true);
    onSubmit(result);
  };

  const score = submitted
    ? questions.reduce((acc, q) => acc + (answers[q.id] === q.correct ? 1 : 0), 0)
    : 0;

  const q = questions[currentQ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 p-6 pb-4 border-b border-gray-100 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                {phaseName} Quiz
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {submitted
                  ? `Score: ${score}/${questions.length}`
                  : `Question ${currentQ + 1} of ${questions.length}`}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="Close quiz">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          {/* Progress bar */}
          {!submitted && (
            <div className="flex gap-1 mt-3">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    answers[questions[i].id] !== undefined
                      ? "bg-purple-500"
                      : i === currentQ
                      ? "bg-purple-200"
                      : "bg-gray-100"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            /* Results view */
            <div className="space-y-4">
              {/* Score card */}
              <div className={`text-center p-6 rounded-2xl ${score >= 4 ? "bg-emerald-50" : score >= 3 ? "bg-amber-50" : "bg-red-50"}`}>
                <Trophy className={`w-12 h-12 mx-auto mb-3 ${score >= 4 ? "text-emerald-500" : score >= 3 ? "text-amber-500" : "text-red-500"}`} />
                <p className="text-3xl font-black">{score}/{questions.length}</p>
                <p className={`text-sm font-semibold mt-1 ${score >= 4 ? "text-emerald-600" : score >= 3 ? "text-amber-600" : "text-red-600"}`}>
                  {score >= 4 ? "Excellent! You've mastered this phase." : score >= 3 ? "Good job! Review a few topics." : "Keep studying — you'll get there!"}
                </p>
              </div>

              {/* Question review */}
              {questions.map((q, i) => {
                const selected = answers[q.id];
                const isCorrect = selected === q.correct;
                return (
                  <div key={q.id} className={`p-4 rounded-xl border ${isCorrect ? "bg-emerald-50/50 border-emerald-200" : "bg-red-50/50 border-red-200"}`}>
                    <p className="font-medium text-gray-900 text-sm mb-2">{i + 1}. {q.question}</p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            oi === q.correct
                              ? "bg-emerald-100 text-emerald-700 font-semibold"
                              : oi === selected && oi !== q.correct
                              ? "bg-red-100 text-red-700 line-through"
                              : "text-gray-500"
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-gray-500 mt-2 italic">💡 {q.explanation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Question view */
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-4">{q.question}</h4>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => handleAnswer(q.id, oi)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                      answers[q.id] === oi
                        ? "border-purple-400 bg-purple-50 text-purple-700 font-medium ring-2 ring-purple-200"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span className="font-bold mr-2 text-gray-400">
                      {String.fromCharCode(65 + oi)}.
                    </span>
                    {opt}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                  disabled={currentQ === 0}
                  className="text-gray-500"
                >
                  Previous
                </Button>
                {currentQ < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQ(currentQ + 1)}
                    disabled={answers[q.id] === undefined}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={Object.keys(answers).length < questions.length}
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                  >
                    Submit Quiz
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---- Phase Resources Component ----
function PhaseResourcesView({ phaseIndex }: { phaseIndex: number }) {
  const { phaseResources, loadingResources } = useRoadmapStore();
  const resources = phaseResources[phaseIndex];
  const isLoading = loadingResources[phaseIndex];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading resources...</span>
      </div>
    );
  }

  if (!resources) return null;

  const ytCount = resources.youtube_playlists?.length || 0;
  const courseCount = resources.courses?.length || 0;
  const blogCount = resources.blogs?.length || 0;

  if (ytCount === 0 && courseCount === 0 && blogCount === 0) {
    return (
      <p className="text-sm text-gray-400 p-4">No resources found for this phase.</p>
    );
  }

  return (
    <div className="space-y-3">
      {/* YouTube */}
      {ytCount > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
            <Youtube className="w-3.5 h-3.5" /> YouTube ({ytCount})
          </h5>
          {resources.youtube_playlists!.slice(0, 3).map((pl: any, i: number) => (
            <a
              key={i}
              href={pl.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50/50 hover:bg-red-50 border border-red-100/50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <Youtube className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-red-600 transition-colors">{pl.title}</p>
                <p className="text-xs text-gray-400">{pl.channel}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-red-400 shrink-0" />
            </a>
          ))}
        </div>
      )}

      {/* Courses */}
      {courseCount > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" /> Courses ({courseCount})
          </h5>
          {resources.courses!.slice(0, 2).map((c: any, i: number) => (
            <a
              key={i}
              href={c.registrationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-50/50 hover:bg-blue-50 border border-blue-100/50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">{c.name}</p>
                <p className="text-xs text-gray-400">{c.platform} • {c.workload}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 shrink-0" />
            </a>
          ))}
        </div>
      )}

      {/* Blogs */}
      {blogCount > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Articles ({blogCount})
          </h5>
          {resources.blogs!.slice(0, 2).map((b: any, i: number) => (
            <a
              key={i}
              href={b.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/50 transition-colors group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-emerald-600 transition-colors">{b.title}</p>
                <p className="text-xs text-gray-400">{b.author}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-emerald-400 shrink-0" />
            </a>
          ))}
        </div>
      )}

      {/* View all resources link */}
      <Link
        href={`/dashboard/resources`}
        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 pt-1"
      >
        View all resources <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ---- Main Page ----
export default function RoadmapPage() {
  const {
    roadmap,
    isGenerating,
    sourceType,
    expandedPhases,
    completedPhases,
    topicChecklist,
    phaseResources,
    loadingResources,
    phaseQuizzes,
    quizResults,
    loadingQuiz,
    skillGaps,
    setRoadmap,
    setGenerating,
    togglePhase,
    togglePhaseComplete,
    toggleTopic,
    setPhaseResources,
    setLoadingResources,
    setPhaseQuiz,
    setQuizResult,
    setLoadingQuiz,
    getPhaseProgress,
    getOverallProgress,
    reset,
  } = useRoadmapStore();

  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [quizModal, setQuizModal] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Record<number, "topics" | "resources" | "quiz">>({});

  // Animate phases on mount when roadmap exists
  useEffect(() => {
    if (roadmap && visibleCount === 0) {
      for (let i = 0; i <= roadmap.steps.length; i++) {
        setTimeout(() => setVisibleCount(i + 1), i * 200);
      }
    }
  }, [roadmap]);

  const generateRoadmap = async (topic: string) => {
    if (!topic.trim()) return;
    setSearchLoading(true);
    setError(null);
    setVisibleCount(0);

    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const json = await res.json();
      if (json.success) {
        setRoadmap(json.data, "manual");
        for (let i = 0; i <= json.data.steps.length; i++) {
          setTimeout(() => setVisibleCount(i + 1), i * 200);
        }
      } else {
        setError(json.error || "Failed to generate roadmap");
      }
    } catch {
      setError("Failed to generate roadmap. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateRoadmap(query);
  };

  // Load resources for a phase
  const loadPhaseResources = async (phaseIndex: number) => {
    if (phaseResources[phaseIndex] || loadingResources[phaseIndex]) return;
    const step = roadmap?.steps[phaseIndex];
    if (!step) return;

    setLoadingResources(phaseIndex, true);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phaseTopics: step.topics.join(", "), topic: step.phase }),
      });
      const json = await res.json();
      if (json.success) {
        setPhaseResources(phaseIndex, json.data);
      }
    } catch {
      setLoadingResources(phaseIndex, false);
    }
  };

  // Load quiz for a phase
  const loadPhaseQuiz = async (phaseIndex: number) => {
    if (phaseQuizzes[phaseIndex] || loadingQuiz[phaseIndex]) return;
    const step = roadmap?.steps[phaseIndex];
    if (!step) return;

    setLoadingQuiz(phaseIndex, true);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phase: step.phase,
          topics: step.topics,
          context: roadmap?.title,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.questions) {
        setPhaseQuiz(phaseIndex, json.data.questions);
      }
    } catch {
      setLoadingQuiz(phaseIndex, false);
    }
  };

  const handleTabChange = (phaseIndex: number, tab: "topics" | "resources" | "quiz") => {
    setActiveTab((prev) => ({ ...prev, [phaseIndex]: tab }));
    if (tab === "resources") loadPhaseResources(phaseIndex);
    if (tab === "quiz") loadPhaseQuiz(phaseIndex);
  };

  const overallProgress = getOverallProgress();
  const loading = isGenerating || searchLoading;

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
          {sourceType === "auto"
            ? "Personalized from your career audit — with resources, checklists & quizzes"
            : "Generate a step-by-step learning path with resources, checklists & quizzes"}
        </p>
      </motion.div>

      {/* Search (always available) */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Generate a new roadmap (e.g., Machine Learning, Web Development)"
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

      {/* Suggestions when no roadmap */}
      {!roadmap && !loading && (
        <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-4">
          {skillGaps.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-2">Close your skill gaps:</p>
              <div className="flex flex-wrap gap-2">
                {skillGaps.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => { setQuery(skill); generateRoadmap(skill); }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-sm font-medium transition-colors border border-rose-100"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2">Popular roadmaps:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_ROADMAPS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => { setQuery(topic); generateRoadmap(topic); }}
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
            {isGenerating ? "Building your personalized roadmap from audit..." : "Generating your roadmap..."}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
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
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 to-purple-600" />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {sourceType === "auto" && (
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">
                          <Zap className="w-3 h-3 mr-0.5" /> Auto-Generated
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl font-black text-gray-900">
                      {roadmap.title}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-3 flex-wrap">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { reset(); setQuery(""); setVisibleCount(0); }}
                    className="text-gray-500"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" /> New
                  </Button>
                </div>
              </CardHeader>

              {/* Overall Progress */}
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-linear-to-r from-indigo-500 to-purple-600 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${overallProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-600">
                    {Object.values(completedPhases).filter(Boolean).length}/{roadmap.steps.length}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Phases */}
            <div className="space-y-4">
              {roadmap.steps.map((step, index) => {
                const phaseProgress = getPhaseProgress(index);
                const isExpanded = expandedPhases[index];
                const isCompleted = completedPhases[index];
                const tab = activeTab[index] || "topics";
                const hasQuizResult = !!quizResults[index];

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={visibleCount > index ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card
                      className={`border-0 shadow-lg transition-all duration-300 overflow-hidden ${
                        isCompleted ? "bg-emerald-50/50 border-emerald-100" : "glass-card hover:shadow-xl"
                      }`}
                    >
                      {/* Phase Header */}
                      <div
                        className="flex items-center gap-4 p-5 cursor-pointer group"
                        onClick={() => togglePhase(index)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePhaseComplete(index); }}
                          className="shrink-0"
                        >
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                              isCompleted
                                ? "bg-emerald-100 text-emerald-600"
                                : "bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <span className="font-bold text-sm">{index + 1}</span>
                            )}
                          </div>
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`text-lg font-bold ${isCompleted ? "text-emerald-700 line-through" : "text-gray-900"}`}>
                              {step.phase}
                            </h3>
                            {hasQuizResult && (
                              <Badge className="bg-purple-50 text-purple-600 border-purple-200 text-[10px]">
                                Quiz: {quizResults[index].score}/{quizResults[index].total}
                              </Badge>
                            )}
                          </div>
                          {step.description && (
                            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{step.description}</p>
                          )}
                          {/* Topic progress mini bar */}
                          {phaseProgress > 0 && !isCompleted && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-400 rounded-full transition-all"
                                  style={{ width: `${phaseProgress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-400 font-semibold">{phaseProgress}%</span>
                            </div>
                          )}
                        </div>

                        <div className="text-gray-400 transition-transform duration-200">
                          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 pt-0 ml-14 space-y-4">
                              {/* Tab Switcher */}
                              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
                                {(["topics", "resources", "quiz"] as const).map((t) => (
                                  <button
                                    key={t}
                                    onClick={() => handleTabChange(index, t)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                                      tab === t
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                    }`}
                                  >
                                    {t === "topics" && "📋 Checklist"}
                                    {t === "resources" && "📚 Resources"}
                                    {t === "quiz" && "🧠 Quiz"}
                                  </button>
                                ))}
                              </div>

                              {/* Topics / Checklist Tab */}
                              {tab === "topics" && (
                                <div className="space-y-4">
                                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                      Topics Checklist ({Object.values(topicChecklist[index] || {}).filter(Boolean).length}/{step.topics.length})
                                    </h4>
                                    <ul className="space-y-2">
                                      {step.topics.map((topic, ti) => {
                                        const checked = topicChecklist[index]?.[ti];
                                        return (
                                          <li
                                            key={ti}
                                            className="flex items-start gap-2.5 cursor-pointer group/topic"
                                            onClick={() => toggleTopic(index, ti)}
                                          >
                                            <div className="mt-0.5 shrink-0">
                                              {checked ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                              ) : (
                                                <Circle className="w-4 h-4 text-gray-300 group-hover/topic:text-indigo-400 transition-colors" />
                                              )}
                                            </div>
                                            <span className={`text-sm ${checked ? "text-gray-400 line-through" : "text-gray-700"}`}>
                                              {topic}
                                            </span>
                                          </li>
                                        );
                                      })}
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
                                          <li key={pi} className="text-sm text-purple-700 font-medium">• {project}</li>
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
                                        {step.milestones.map((m, mi) => (
                                          <li key={mi} className="text-sm text-emerald-700 font-medium">✓ {m}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Resources Tab */}
                              {tab === "resources" && (
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                  <PhaseResourcesView phaseIndex={index} />
                                </div>
                              )}

                              {/* Quiz Tab */}
                              {tab === "quiz" && (
                                <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                                  {loadingQuiz[index] ? (
                                    <div className="flex items-center gap-2 text-gray-500">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      <span className="text-sm">Generating quiz...</span>
                                    </div>
                                  ) : phaseQuizzes[index] ? (
                                    <div className="space-y-3">
                                      {quizResults[index] ? (
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <Trophy className={`w-5 h-5 ${quizResults[index].score >= 4 ? "text-emerald-500" : quizResults[index].score >= 3 ? "text-amber-500" : "text-red-500"}`} />
                                            <div>
                                              <p className="font-semibold text-gray-900">
                                                Score: {quizResults[index].score}/{quizResults[index].total}
                                              </p>
                                              <p className="text-xs text-gray-500">
                                                {quizResults[index].score >= 4 ? "Excellent!" : quizResults[index].score >= 3 ? "Good work!" : "Keep studying!"}
                                              </p>
                                            </div>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setQuizModal(index)}
                                            className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                          >
                                            Review Answers
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="font-semibold text-gray-900">Quiz Ready!</p>
                                            <p className="text-xs text-gray-500">{phaseQuizzes[index].length} questions to test your knowledge</p>
                                          </div>
                                          <Button
                                            size="sm"
                                            onClick={() => setQuizModal(index)}
                                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                                          >
                                            <Brain className="w-4 h-4 mr-1" /> Take Quiz
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400">Failed to load quiz. Try switching tabs.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>

                    {/* Connector Line */}
                    {index < roadmap.steps.length - 1 && visibleCount > index && (
                      <div className="flex justify-start ml-7">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 16 }}
                          transition={{ duration: 0.3 }}
                          className="w-0.5 bg-linear-to-b from-indigo-300 to-purple-300"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
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
            {sourceType === null ? "No Roadmap Yet" : "Generate a Learning Roadmap"}
          </h3>
          <p className="text-gray-400 max-w-md mb-4">
            Upload your resume first for a personalized roadmap, or search for any topic above to get started.
          </p>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl">
            <Link href="/dashboard/resume">
              Upload Resume <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </motion.div>
      )}

      {/* Quiz Modal */}
      <AnimatePresence>
        {quizModal !== null && phaseQuizzes[quizModal] && (
          <QuizModal
            questions={phaseQuizzes[quizModal]}
            phaseIndex={quizModal}
            phaseName={roadmap?.steps[quizModal]?.phase || `Phase ${quizModal + 1}`}
            existingResult={quizResults[quizModal]}
            onClose={() => setQuizModal(null)}
            onSubmit={(result) => setQuizResult(quizModal!, result)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
