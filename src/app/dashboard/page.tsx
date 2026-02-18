"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  TrendingUp,
  Target,
  Zap,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  Github,
  Trophy,
  History,
  Rocket,
  Shield,
  Lightbulb,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("sprints");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/data");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (sprintId: number, taskId: string) => {
    // Optimistic UI update
    const updatedData = { ...data };
    const taskIndex = updatedData.sprint.tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex !== -1) {
      const currentStatus = updatedData.sprint.tasks[taskIndex].completed;
      updatedData.sprint.tasks[taskIndex].completed = !currentStatus;
      setData(updatedData);
      
      try {
        await fetch('/api/dashboard/task/toggle', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sprintId, taskId }) 
        });
      } catch (error) {
        // Rollback on error
        const rollbackData = { ...data };
        rollbackData.sprint.tasks[taskIndex].completed = currentStatus;
        setData(rollbackData);
        console.error("Task toggle failed:", error);
      }
    }
  };

  // Process skill map for Recharts
  const processedSkillMap = useMemo(() => {
    if (!data?.audit?.skillMap) return [];
    return Object.entries(data.audit.skillMap).map(([subject, score]: [string, any]) => ({
      subject,
      A: score,
      fullMark: 100,
    }));
  }, [data]);

  const marketTrends = [
    { month: 'Oct', demand: 65 },
    { month: 'Nov', demand: 72 },
    { month: 'Dec', demand: 85 },
    { month: 'Jan', demand: 80 },
    { month: 'Feb', demand: 92 },
  ];

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-gray-500 font-medium animate-pulse">Initializing CareerOS Intelligence...</p>
      </div>
    );
  }

  // Fallback if no audit data exists
  if (!data?.audit) {
    return (
        <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-6">
            <FileText className="w-10 h-10 text-indigo-500" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-3">No Career Audit Found</h2>
          <p className="text-gray-500 max-w-md mb-8">
            Upload your resume to generate your Career Intelligence Audit and unlock your personalized weekly sprints.
          </p>
          <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-10 shadow-xl shadow-indigo-100">
            <Link href="/dashboard/resume">
              Start Your Audit <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
    );
  }

  const { audit, sprint, user, projects: userProjects } = data;
  const completionRate = sprint ? (sprint.tasks.filter((t: any) => t.completed).length / sprint.tasks.length) * 100 : 0;

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Badge variant="secondary" className="mb-2 px-3 py-1 bg-indigo-50 text-indigo-600 border-indigo-100 flex items-center gap-1.5 w-fit">
            <Zap className="w-3.5 h-3.5 fill-current" /> CareerOS 2.0 Active
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 leading-none">
            Welcome back, <span className="gradient-text italic">{user.name?.split(' ')[0] || 'Developer'}</span>
          </h1>
          <p className="text-gray-500 mt-3 text-lg font-medium">Your execution engine is optimized. Focus on this week's sprint.</p>
        </div>
        <div className="flex gap-3">
          <div className="glass-card px-5 py-3 rounded-2xl flex items-center gap-4 border border-indigo-50 shadow-sm">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Current Streak</p>
              <p className="text-xl font-black text-gray-900">{user.streak || 0} Days</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
              <Trophy className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Module 1: Readiness Score & Heatmap */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" className="lg:col-span-1 space-y-6">
          <Card className="glass-premium border-0 shadow-xl overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" /> Readiness Audit
              </CardTitle>
              <CardDescription>Quantified career performance</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-4">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96" cy="96" r="88"
                    className="stroke-gray-100 fill-none"
                    strokeWidth="12"
                  />
                  <motion.circle
                    cx="96" cy="96" r="88"
                    className="stroke-indigo-600 fill-none"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 88}
                    initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - audit.readinessScore / 100) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-5xl font-black text-gray-900 leading-none">{audit.readinessScore}</span>
                  <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-1">Readiness</span>
                </div>
              </div>

              <div className="grid grid-cols-2 w-full gap-4 mt-8">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 dark:bg-gray-800">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Market Match</p>
                  <p className="text-lg font-bold text-gray-900">{audit.marketMatchScore}%</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Project Qual</p>
                  <p className="text-lg font-bold text-gray-900">{audit.projectQualityScore}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Module 3: Skill Heatmap */}
          <Card className="glass-card border-0 shadow-lg">
            <CardHeader className="pb-0">
              <CardTitle className="text-base font-bold">Skill Heatmap</CardTitle>
            </CardHeader>
            <CardContent className="h-[280px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={processedSkillMap}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                  <Radar
                    name="Skills"
                    dataKey="A"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Module 2: Weekly AI Sprint Engine */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" className="lg:col-span-2">
          <Tabs defaultValue="sprints" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-gray-100/50 backdrop-blur-sm p-1 rounded-xl">
                <TabsTrigger value="sprints" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-300">
                  Weekly Sprint
                </TabsTrigger>
                <TabsTrigger value="radar" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-300">
                  Market Radar
                </TabsTrigger>
                <TabsTrigger value="projects" className="rounded-lg px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-300">
                  Project Ideas 
                </TabsTrigger>
              </TabsList>
              
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400 font-medium">
                <History className="w-4 h-4" /> Sprint Hist
              </div>
            </div>

            <AnimatePresence mode="wait">
              <TabsContent value="sprints" key="sprints">
                {!sprint ? (
                   <Card className="border-0 shadow-xl bg-white/40 backdrop-blur-md rounded-3xl p-12 text-center">
                      <Zap className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900">No Active Sprint</h3>
                      <p className="text-gray-500 mb-6">Your next weekly execution plan is ready to be generated.</p>
                      <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100">
                          Generate Sprint
                      </Button>
                   </Card>
                ) : (
                  <Card className="border-0 shadow-xl bg-white/40 backdrop-blur-md rounded-3xl overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-2xl font-black">Week #{sprint.weekNumber} Execution</CardTitle>
                          <CardDescription>Generated by Career AI based on your skill gaps</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-bold text-indigo-600">{Math.round(completionRate)}% Complete</span>
                           <Progress value={completionRate} className="w-24 h-2" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-100">
                        {sprint.tasks.map((task: any, i: number) => (
                          <motion.div 
                            key={task.id} 
                            className="flex items-center group p-6 hover:bg-white/60 transition-all duration-300 cursor-pointer"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => toggleTask(sprint.id, task.id)}
                          >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-6 transition-all duration-300 ${task.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-500 group-hover:scale-110'}`}>
                              {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                            </div>
                            <div className="flex-1">
                               <div className="flex items-center gap-2 mb-1">
                                 <span className={`text-[10px] uppercase font-black tracking-widest ${task.completed ? 'text-emerald-500' : 'text-indigo-400'}`}>
                                   {task.type}
                                 </span>
                                 <span className="text-gray-300">•</span>
                                 <span className="text-[10px] font-bold text-gray-400">{task.time_estimate || '2h'}</span>
                               </div>
                               <p className={`font-bold text-lg leading-tight ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900 group-hover:text-indigo-600'}`}>
                                 {task.description}
                               </p>
                            </div>
                            <ArrowRight className={`w-5 h-5 transition-all duration-300 ${task.completed ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-1 text-indigo-500'}`} />
                          </motion.div>
                        ))}
                      </div>
                      <div className="p-6 bg-indigo-50/50 border-t border-indigo-50 flex justify-between items-center">
                         <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Tasks refresh every <span className="text-indigo-600 font-bold">Monday</span></p>
                         <Button variant="ghost" className="text-gray-400 hover:text-indigo-600 gap-2 font-bold" onClick={fetchDashboardData}>
                            <RefreshCw className="w-4 h-4" /> Refresh Sync
                         </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="radar" key="radar">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Market Trends Chart */}
                  <Card className="border-0 shadow-lg p-6 flex flex-col justify-between">
                     <CardTitle className="text-lg font-bold mb-4 flex items-center gap-2">
                       <TrendingUp className="w-5 h-5 text-indigo-500" /> Market Alignment
                     </CardTitle>
                     <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={marketTrends}>
                            <defs>
                              <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="demand" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorDemand)" />
                            <Tooltip />
                          </AreaChart>
                        </ResponsiveContainer>
                     </div>
                     <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
                          +15% Growth <span className="text-gray-400 font-normal">in your target role this month</span>
                        </p>
                     </div>
                  </Card>

                  {/* Top Skills in Demand */}
                  <Card className="border-0 shadow-lg p-6">
                     <CardTitle className="text-lg font-bold mb-4">Trending Tech Stacks</CardTitle>
                     <div className="space-y-4">
                        {[
                          { name: "Neon (Serverless Postgres)", score: 92, trend: "+12%" },
                          { name: "Next.js 15 (App Router)", score: 88, trend: "+8%" },
                          { name: "AI Agent Frameworks", score: 95, trend: "+24%" },
                        ].map((tech) => (
                          <div key={tech.name} className="flex items-center justify-between">
                             <div>
                               <p className="font-bold text-gray-800">{tech.name}</p>
                               <p className="text-xs text-indigo-500 font-bold">{tech.trend} demand rise</p>
                             </div>
                             <div className="text-right">
                               <div className="h-2 w-20 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500" style={{ width: `${tech.score}%` }} />
                                </div>
                             </div>
                          </div>
                        ))}
                     </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="projects" key="projects">
                <div className="grid md:grid-cols-2 gap-6">
                   <Card className="border-2 border-dashed border-indigo-100 flex flex-col items-center justify-center p-12 text-center group cursor-pointer hover:border-indigo-300 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Rocket className="w-8 h-8 text-indigo-500" />
                      </div>
                      <h3 className="text-xl font-black text-gray-800">Generate New Ideas</h3>
                      <p className="text-sm text-gray-400 mt-2">Personalized based on your skill gaps and GitHub history</p>
                   </Card>
                   
                   {userProjects.map((p: any) => (
                    <Card key={p.id} className="border-0 shadow-lg p-6 hover:shadow-xl transition-shadow relative overflow-hidden h-fit">
                        <div className="absolute top-0 right-0 p-3">
                          <Badge className="bg-amber-100 text-amber-600 border-0">Resume-Ready</Badge>
                        </div>
                        <h3 className="text-lg font-extrabold text-gray-900">{p.title}</h3>
                        <p className="text-sm text-gray-500 mt-2 leading-relaxed line-clamp-2">
                          {p.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          {p.techStack?.slice(0, 3).map((tech: string) => (
                            <Badge key={tech} variant="outline" className="text-[10px] font-bold">{tech}</Badge>
                          ))}
                        </div>
                        <Button variant="ghost" className="w-full mt-6 text-indigo-600 font-bold group">
                          View Blueprints <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </Card>
                   ))}
                </div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
          
          {/* AI Insights Feed */}
          <div className="mt-8">
             <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h3 className="text-xl font-black text-gray-900">AI Intelligence Feed</h3>
             </div>
             <div className="grid md:grid-cols-2 gap-4">
                <div className="glass-card p-4 rounded-2xl flex items-start gap-4 border-l-4 border-amber-400">
                   <Shield className="w-6 h-6 text-amber-500 mt-1 flex-shrink-0" />
                   <div>
                      <p className="font-bold text-gray-900">Vulnerability Detected in Skills</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {audit.atsKeywordAnalysis?.skill_gaps?.[0] ? `Your lack of ${audit.atsKeywordAnalysis.skill_gaps[0]} is a major risk.` : 'Analyzing skill vulnerabilities...'}
                      </p>
                   </div>
                </div>
                <div className="glass-card p-4 rounded-2xl flex items-start gap-4 border-l-4 border-indigo-400">
                   <Lightbulb className="w-6 h-6 text-indigo-500 mt-1 flex-shrink-0" />
                   <div>
                      <p className="font-bold text-gray-900">Market Opportunity</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {audit.atsKeywordAnalysis?.market_alignment || 'Analyzing market opportunities based on your profile...'}
                      </p>
                   </div>
                </div>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const FileText = ({ className }: { className?: string }) => (
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
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
