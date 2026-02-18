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
  TrendingUp,
  Target,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore } from "@/stores/chat-store";
import type { ChatMessage, PlacementAnalysis } from "@/lib/types";
import Link from "next/link";

export default function ChatPage() {
  const {
    messages,
    isLoading,
    isAnalysisComplete,
    placementAnalysis,
    addMessage,
    setLoading,
    setPlacementAnalysis,
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
        body: JSON.stringify({ messages: allMessages }),
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

        // Check if response contains placement analysis JSON
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            const analysis: PlacementAnalysis = JSON.parse(jsonMatch[1]);
            if (analysis.dsa_topic_heatmap && analysis.hr_question_generator) {
              setPlacementAnalysis(analysis);
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

  const startPlacementPrep = () => {
    reset();
    const welcomeMessage: ChatMessage = {
      id: `assistant-welcome`,
      role: "assistant",
      content:
        "Welcome to **Placement Mode**! 🚀\n\nI'm your specialized AI Interview & Placement coach. I'll help you prepare for specific company interviews (like TCS, Zomato, or Big Tech) and conduct deep practice sessions.\n\nType your **Target Role** and any **Target Companies** you have in mind to begin your customized prep session.",
      timestamp: new Date().toISOString(),
    };
    addMessage(welcomeMessage);
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-500 fill-current" /> Placement Mode
          </h1>
          <p className="text-sm text-gray-500">
            Company-specific prep and simulated interviews.
          </p>
        </div>
        <Button variant="outline" size="sm" className="glass-card" onClick={startPlacementPrep}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Start New Prep
        </Button>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="glass-card border-0 flex-1 flex flex-col min-h-0 overflow-hidden shadow-xl">
            {/* Messages */}
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 px-6">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-xl shadow-indigo-100 ring-4 ring-indigo-50">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">
                    Enter Interview Prep
                  </h3>
                  <p className="text-gray-500 max-w-sm mb-8 font-medium">
                    Conduct mock interviews, get company-specific roadmaps, and solve high-frequency DSA patterns.
                  </p>
                  <Button
                    size="lg"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-lg shadow-indigo-100 rounded-2xl px-8"
                    onClick={startPlacementPrep}
                  >
                    🚀 Start Placement Session
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  <AnimatePresence>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex gap-4 ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1 shadow-md">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-3xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                            msg.role === "user"
                              ? "bg-indigo-600 text-white rounded-tr-none"
                              : "bg-white border border-gray-100 text-gray-700 rounded-tl-none"
                          }`}
                        >
                          <div className="whitespace-pre-wrap mark-json">
                            {msg.content.includes("```json") 
                               ? msg.content.substring(0, msg.content.indexOf("```json")).trim() + "\n\n[Placement Analysis Processed ✓]"
                               : msg.content}
                          </div>
                        </div>
                        {msg.role === "user" && (
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-1 text-gray-400">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="bg-white border border-gray-100 rounded-3xl rounded-tl-none px-5 py-3.5 shadow-sm">
                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          Simulating interviewer response...
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input */}
            {messages.length > 0 && (
              <div className="p-4 bg-gray-50/50 border-t border-gray-100">
                <div className="flex gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 ring-1 ring-gray-100">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about a company, role, or practice a question..."
                    className="min-h-[44px] max-h-32 resize-none bg-transparent border-0 focus-visible:ring-0 shadow-none"
                    rows={1}
                    disabled={isLoading}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 h-11 w-11 p-0 rounded-xl shadow-md"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Placement Info Panel */}
        <AnimatePresence>
          {isAnalysisComplete && placementAnalysis && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="hidden lg:block w-96"
            >
              <Card className="glass-premium border-0 h-full overflow-hidden shadow-2xl flex flex-col">
                <div className="h-1 bg-gradient-to-r from-emerald-400 to-indigo-500" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-500" /> Prep Intelligence
                  </CardTitle>
                  <CardDescription>Generated from session context</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto space-y-6 pt-2 pb-6">
                  
                  {/* Readiness Score */}
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                    <p className="text-[10px] uppercase font-black text-indigo-400 tracking-widest mb-1">Interview Readiness</p>
                    <div className="flex items-end justify-center gap-1">
                      <span className="text-4xl font-black text-indigo-700">{placementAnalysis.interview_readiness_score}</span>
                      <span className="text-sm font-bold text-indigo-400 mb-1.5">%</span>
                    </div>
                    <Progress value={placementAnalysis.interview_readiness_score} className="h-2 mt-3 bg-white" />
                  </div>

                  {/* DSA Heatmap */}
                  <div>
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5" /> High-Freq DSA Heatmap
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(placementAnalysis.dsa_topic_heatmap).map(([topic, weight]) => (
                        <div key={topic}>
                           <div className="flex justify-between text-xs font-bold mb-1">
                              <span>{topic}</span>
                              <span className="text-gray-400">{weight}% freq</span>
                           </div>
                           <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${weight}%` }} />
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* HR Prep */}
                  <div>
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                      HR/Behavioral Prep
                    </h4>
                    <div className="space-y-2">
                      {placementAnalysis.hr_question_generator.map((q, i) => (
                        <div key={i} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-medium text-gray-700 italic">
                          "{q}"
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Roadmap Summary */}
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-2">Company Specific Strategy</h4>
                    <p className="text-xs leading-relaxed text-emerald-800 font-medium">
                      {placementAnalysis.company_specific_roadmap}
                    </p>
                  </div>

                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-lg shadow-indigo-100 py-6 rounded-2xl font-bold"
                    asChild
                  >
                    <Link href="/dashboard">
                      Return to Execution <ArrowRight className="w-4 h-4 ml-2" />
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

const Zap = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M4 14.752V3a1 1 0 0 1 1.574-.816l13 9a1 1 0 0 1 0 1.632l-13 9A1 1 0 0 1 4 21v-6.248" />
  </svg>
);
