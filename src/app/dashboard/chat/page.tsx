"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/stores/chat-store";
import type { ChatMessage, CareerAnalysis } from "@/lib/types";
import Link from "next/link";

export default function ChatPage() {
  const {
    messages,
    isLoading,
    isAnalysisComplete,
    careerAnalysis,
    addMessage,
    setLoading,
    setCareerAnalysis,
    reset,
  } = useChatStore();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
    setLoading(true);

    try {
      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages, stream: false }),
      });

      const data = await response.json();

      if (data.success) {
        const content = data.data.content;

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content,
          timestamp: new Date().toISOString(),
        };
        addMessage(assistantMessage);

        // Check if response contains career analysis JSON
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            const analysis: CareerAnalysis = JSON.parse(jsonMatch[1]);
            if (analysis.top_roles && analysis.skills_detected) {
              setCareerAnalysis(analysis);
            }
          } catch {
            // Not valid JSON, continue conversation
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startConversation = () => {
    reset();
    const welcomeMessage: ChatMessage = {
      id: `assistant-welcome`,
      role: "assistant",
      content:
        "Hi! I'm your AI Career Intelligence Agent. 👋\n\nI'll conduct a structured career analysis by asking you a series of questions about your background, skills, and career goals.\n\nAt the end, I'll generate a comprehensive career report with role recommendations, salary projections, and a personalized roadmap.\n\n**Let's start — what is your current role or profession?**",
      timestamp: new Date().toISOString(),
    };
    addMessage(welcomeMessage);
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Career Agent</h1>
          <p className="text-sm text-gray-500">
            Conversational career analysis powered by Gemini
          </p>
        </div>
        <Button variant="outline" size="sm" className="glass-card" onClick={startConversation}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> New Chat
        </Button>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="glass-card border-0 flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Career Intelligence Agent
                  </h3>
                  <p className="text-sm text-gray-500 max-w-md mb-6">
                    Start a conversation to receive AI-powered career analysis.
                    I&apos;ll ask about your skills, experience, and goals to generate
                    personalized recommendations.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
                    onClick={startConversation}
                  >
                    <Sparkles className="w-4 h-4 mr-2" /> Start Analysis
                  </Button>
                </div>
              ) : (
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
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-indigo-500 text-white"
                              : "bg-gray-50 text-gray-700"
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.content.replace(/```json[\s\S]*?```/g, "[Career Analysis Generated ✓]")}</div>
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
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
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
              )}
            </ScrollArea>

            {/* Input */}
            {messages.length > 0 && !isAnalysisComplete && (
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your response..."
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

        {/* Analysis Panel */}
        <AnimatePresence>
          {isAnalysisComplete && careerAnalysis && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="hidden lg:block w-80"
            >
              <Card className="glass-card border-0 h-full overflow-auto">
                <CardContent className="p-5 space-y-5">
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Analysis Complete
                    </h3>
                  </div>

                  {/* Top Roles */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                      Top Roles
                    </h4>
                    <div className="space-y-2">
                      {careerAnalysis.top_roles.map((role) => (
                        <div key={role.title} className="p-3 bg-gray-50 rounded-xl">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {role.title}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {role.fit_score}%
                            </Badge>
                          </div>
                          <Progress value={role.fit_score} className="h-1 mb-1.5" />
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{role.salary_range}</span>
                            <span>{role.risk_index} risk</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                      Skills Detected
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {careerAnalysis.skills_detected.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Skill Gaps */}
                  {careerAnalysis.skill_gaps.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                        Skill Gaps
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {careerAnalysis.skill_gaps.map((gap) => (
                          <Badge key={gap} variant="destructive" className="text-xs font-normal">
                            {gap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Roadmap */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                      Roadmap
                    </h4>
                    <div className="space-y-2">
                      {careerAnalysis.recommended_roadmap.slice(0, 4).map((item) => (
                        <div key={item.step} className="flex gap-2 items-start">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-indigo-600">
                              {item.step}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {item.duration}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0"
                    asChild
                  >
                    <Link href="/dashboard">
                      View Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
