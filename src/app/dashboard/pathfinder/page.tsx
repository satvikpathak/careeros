"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Trophy,
  Target,
  Lightbulb,
  TrendingUp,
  BookOpen,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePathfinderStore } from "@/stores/pathfinder-store";
import { INTEREST_CATEGORIES, PROGRESS_STAGES } from "@/lib/constants";
import type { ChatMessage, PathfinderAnalysis } from "@/lib/types";
import Link from "next/link";

export default function PathfinderPage() {
  const {
    selectedInterests,
    messages,
    isLoading,
    progress,
    isAnalysisComplete,
    analysis,
    step,
    toggleInterest,
    addMessage,
    setLoading,
    setProgress,
    setAnalysis,
    setStep,
    reset,
  } = usePathfinderStore();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Start the pathfinder conversation with selected interests
  const startConversation = useCallback(() => {
    const interestLabels = selectedInterests
      .map((id) => INTEREST_CATEGORIES.find((c) => c.id === id)?.label)
      .filter(Boolean)
      .join(", ");

    setStep("conversation");

    const systemContext: ChatMessage = {
      id: `user-context-${Date.now()}`,
      role: "user",
      content: `Hi! I'm exploring career options and I'm interested in these areas: ${interestLabels}. Can you help me figure out what career path might be right for me?`,
      timestamp: new Date().toISOString(),
    };

    addMessage(systemContext);
    sendMessageToAI([systemContext]);
  }, [selectedInterests]);

  const sendMessageToAI = async (messagesToSend: ChatMessage[]) => {
    setLoading(true);

    try {
      const apiMessages = messagesToSend.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          stream: false,
          mode: "pathfinder",
        }),
      });

      const data = await response.json();

      if (data.success) {
        const content = data.data.content;
        const progressData = data.data.progress;

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content,
          timestamp: new Date().toISOString(),
        };
        addMessage(assistantMessage);

        // Update progress from API response
        if (progressData) {
          const stagesCompleted = progressData.stages_completed || [];
          const messageCount = progressData.message_count || messages.length;
          const completedWeight = PROGRESS_STAGES
            .filter((s) => stagesCompleted.includes(s.stage))
            .reduce((sum, s) => sum + s.weight, 0);
          const messageBonus = Math.min(messageCount * 3, 15);
          const percentage = Math.min(completedWeight + messageBonus, 100);

          const currentStageIndex = stagesCompleted.length;
          const currentStage =
            PROGRESS_STAGES[currentStageIndex] ||
            PROGRESS_STAGES[PROGRESS_STAGES.length - 1];

          setProgress({
            stage: currentStage.stage,
            percentage,
            stagesCompleted,
            totalStages: PROGRESS_STAGES.length,
            currentStageLabel: currentStage.label,
            isComplete:
              percentage >= 85 ||
              stagesCompleted.length >= PROGRESS_STAGES.length - 1,
          });
        }

        // Check if response contains pathfinder analysis JSON
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            const pathfinderResult: PathfinderAnalysis = JSON.parse(
              jsonMatch[1]
            );
            if (
              pathfinderResult.recommended_careers &&
              pathfinderResult.roadmap
            ) {
              setAnalysis(pathfinderResult);
              setProgress({
                ...progress,
                percentage: 100,
                isComplete: true,
                stage: "analysis",
                currentStageLabel: "Analysis Complete",
              });
            }
          } catch {
            // Not valid JSON yet, continue conversation
          }
        }
      } else {
        addMessage({
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "I encountered an issue. Please try again.",
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      addMessage({
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Connection error. Please check your network and try again.",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);
    setInput("");

    const allMessages = [...messages, userMessage];
    sendMessageToAI(allMessages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ============================================
  // STEP 1: Interest Selection
  // ============================================
  if (step === "interests") {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 mb-4"
          >
            <Compass className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              Career Pathfinder
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold text-gray-900 mb-3"
          >
            What excites you? 🌟
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 max-w-lg mx-auto"
          >
            Select the areas that spark your curiosity. Don&apos;t overthink it
            — pick everything that sounds interesting! Our AI will help you
            discover the perfect career path.
          </motion.p>
        </div>

        {/* Interest Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8"
        >
          {INTEREST_CATEGORIES.map((category, i) => {
            const isSelected = selectedInterests.includes(category.id);
            return (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * i }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggleInterest(category.id)}
                className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-indigo-400 bg-indigo-50/80 shadow-md shadow-indigo-100"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                }`}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                  </motion.div>
                )}
                <span className="text-2xl mb-2 block">{category.icon}</span>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  {category.label}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {category.description}
                </p>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <Button
            size="lg"
            disabled={selectedInterests.length === 0}
            onClick={startConversation}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 px-8 py-6 text-base rounded-xl shadow-lg shadow-indigo-200/50 disabled:opacity-40 disabled:shadow-none"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start My Career Discovery
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
          <p className="text-xs text-gray-400 mt-3">
            {selectedInterests.length === 0
              ? "Select at least 1 interest to continue"
              : `${selectedInterests.length} interest${selectedInterests.length > 1 ? "s" : ""} selected`}
          </p>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // STEP 2: Conversation + Progress Bar
  // ============================================
  if (step === "conversation" || (step === "results" && !analysis)) {
    return (
      <div className="h-[calc(100vh-5rem)] flex flex-col">
        {/* Header with Progress */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Career Discovery
              </h1>
              <p className="text-sm text-gray-500">
                AI is learning about you to find your ideal path
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="glass-card"
              onClick={reset}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Start Over
            </Button>
          </div>

          {/* Animated Progress Bar */}
          <Card className="glass-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      progress.isComplete ? "bg-emerald-500" : "bg-indigo-500 animate-pulse"
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {progress.currentStageLabel}
                  </span>
                </div>
                <span className="text-sm font-bold text-indigo-600">
                  {Math.round(progress.percentage)}%
                </span>
              </div>
              <Progress
                value={progress.percentage}
                className="h-2"
              />
              {/* Stage indicators */}
              <div className="flex justify-between mt-3">
                {PROGRESS_STAGES.map((stage) => {
                  const isDone = progress.stagesCompleted.includes(stage.stage);
                  const isCurrent = progress.stage === stage.stage;
                  return (
                    <div
                      key={stage.stage}
                      className="flex flex-col items-center gap-1"
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          isDone
                            ? "bg-emerald-500 text-white"
                            : isCurrent
                              ? "bg-indigo-500 text-white ring-4 ring-indigo-100"
                              : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {isDone ? "✓" : PROGRESS_STAGES.indexOf(stage) + 1}
                      </div>
                      <span
                        className={`text-[10px] hidden sm:block ${
                          isDone
                            ? "text-emerald-600 font-medium"
                            : isCurrent
                              ? "text-indigo-600 font-medium"
                              : "text-gray-400"
                        }`}
                      >
                        {stage.label.split(" ").slice(-1)[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="glass-card border-0 flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4 pb-4">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`flex gap-3 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0 mt-1">
                          <Compass className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-indigo-500 text-white"
                            : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">
                          {msg.content.replace(
                            /```json[\s\S]*?```/g,
                            "✨ Career Analysis Generated!"
                          )}
                        </div>
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 mt-1">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                      <Compass className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-gray-50 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Thinking...
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            {!isAnalysisComplete && (
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Share your thoughts..."
                    className="min-h-[44px] max-h-32 resize-none bg-gray-50 border-0 focus-visible:ring-1 focus-visible:ring-indigo-200"
                    rows={1}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white shrink-0 h-11 w-11 p-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ============================================
  // STEP 3: Results
  // ============================================
  return (
    <div className="max-w-5xl mx-auto">
      {/* Success Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200/50 mb-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">
            Analysis Complete
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Your Career Blueprint 🎯
        </h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          Based on our conversation, here are your personalized career
          recommendations.
        </p>
      </motion.div>

      {analysis && (
        <div className="space-y-6">
          {/* Personality & Strengths Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-card border-0 h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Personality Traits
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.personality_traits.map((trait) => (
                      <Badge
                        key={trait}
                        variant="secondary"
                        className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                      >
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="glass-card border-0 h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Strengths
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.strengths_identified.map((strength) => (
                      <Badge
                        key={strength}
                        variant="secondary"
                        className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200"
                      >
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass-card border-0 h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-purple-500" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Explore More
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.exploration_areas.map((area) => (
                      <Badge
                        key={area}
                        variant="outline"
                        className="text-xs"
                      >
                        {area}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recommended Careers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Recommended Career Paths
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.recommended_careers.map((career, i) => (
                <motion.div
                  key={career.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <Card className="glass-card border-0 hover:shadow-lg transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            {career.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="secondary"
                              className="text-xs bg-indigo-50 text-indigo-700"
                            >
                              {career.match_score}% match
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs"
                            >
                              {career.growth_outlook}
                            </Badge>
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                          <span className="text-lg font-bold text-indigo-600">
                            #{i + 1}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">
                        {career.why}
                      </p>
                      <div className="space-y-2 text-xs text-gray-400">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{career.salary_range}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{career.education_path}</span>
                        </div>
                      </div>
                      <Progress
                        value={career.match_score}
                        className="h-1.5 mt-3"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Quick Roadmap Preview */}
          {analysis.roadmap && analysis.roadmap.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="glass-card border-0">
                <CardContent className="p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    Your Learning Roadmap
                  </h2>
                  <div className="space-y-4">
                    {analysis.roadmap.map((phase) => (
                      <div
                        key={phase.phase}
                        className="flex gap-4 items-start"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-white">
                            {phase.phase}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {phase.title}
                            </h4>
                            <span className="text-xs text-gray-400">
                              {phase.duration}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            {phase.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {phase.skills_to_learn.map((skill) => (
                              <Badge
                                key={skill}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-3 justify-center pt-4"
          >
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 px-6"
              asChild
            >
              <Link href="/dashboard/roadmap">
                <BookOpen className="w-4 h-4 mr-2" />
                View Full Roadmap with Resources
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button
              variant="outline"
              className="glass-card"
              onClick={reset}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
