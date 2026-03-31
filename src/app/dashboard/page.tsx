"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
  useInView,
  type Variants,
} from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  Trophy,
  Rocket,
  Shield,
  Lightbulb,
  Loader2,
  RefreshCw,
  FileText,
  BookOpen,
  Map,
  Activity,
  BarChart3,
  Users,
  Clock,
  ArrowUpRight,
  Star,
  Flame,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { useRoadmapStore } from "@/stores/roadmap-store";

/* ============================================ */
/* Animation Variants                           */
/* ============================================ */

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

const slideRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 20 },
  },
};

/* ============================================ */
/* AnimatedCounter Component                    */
/* ============================================ */

function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  duration = 1.5,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const display = useTransform(motionValue, (v) => {
    return `${prefix}${v.toFixed(decimals)}${suffix}`;
  });

  useEffect(() => {
    if (isInView) {
      animate(motionValue, value, {
        duration,
        ease: [0.25, 0.46, 0.45, 0.94],
      });
    }
  }, [isInView, value, motionValue, duration]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

/* ============================================ */
/* KPI Card Component                           */
/* ============================================ */

interface KPICardProps {
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  index: number;
}

function KPICard({
  title,
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  change,
  changeLabel,
  icon: Icon,
  iconColor,
  iconBg,
  index,
}: KPICardProps) {
  const isPositive = change >= 0;

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{
        y: -4,
        boxShadow: "0 20px 40px -12px rgba(0,0,0,0.08)",
        transition: { duration: 0.2 },
      }}
      className="bg-white rounded-[24px] border border-gray-100 p-6 relative overflow-hidden group cursor-default"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      {/* Subtle shimmer on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"
      />

      <div className="flex items-start justify-between mb-4">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg}`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </motion.div>

        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${
            isPositive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-rose-50 text-rose-600"
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {isPositive ? "+" : ""}
          {change}%
        </div>
      </div>

      <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">
        {title}
      </p>

      <p className="text-3xl font-extrabold text-[#020617] tracking-tight leading-none">
        <AnimatedCounter
          value={value}
          suffix={suffix}
          prefix={prefix}
          decimals={decimals}
        />
      </p>

      <p className="text-[11px] text-[#9CA3AF] mt-2 font-medium">{changeLabel}</p>
    </motion.div>
  );
}

/* ============================================ */
/* Live Activity Item                           */
/* ============================================ */

interface ActivityItem {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  time: string;
}

function LiveActivityCard({ item, index }: { item: ActivityItem; index: number }) {
  return (
    <motion.div
      variants={slideRight}
      whileHover={{ x: -4, transition: { duration: 0.15 } }}
      className="flex items-start gap-3 p-3 rounded-2xl hover:bg-gray-50/50 transition-colors cursor-default group"
    >
      <motion.div
        whileHover={{ scale: 1.15 }}
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconBg}`}
      >
        <item.icon className={`w-4 h-4 ${item.iconColor}`} />
      </motion.div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#020617] leading-tight truncate">
          {item.title}
        </p>
        <p className="text-[11px] text-[#9CA3AF] mt-0.5 truncate">{item.description}</p>
      </div>
      <span className="text-[10px] font-medium text-[#9CA3AF] whitespace-nowrap mt-0.5">
        {item.time}
      </span>
    </motion.div>
  );
}

/* ============================================ */
/* Tab Button                                   */
/* ============================================ */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="relative px-4 py-2 text-sm font-semibold transition-colors"
    >
      {active && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute inset-0 bg-[#020617] rounded-xl"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      <span
        className={`relative z-10 ${
          active ? "text-white" : "text-[#9CA3AF] hover:text-[#4B5563]"
        }`}
      >
        {children}
      </span>
    </button>
  );
}

/* ============================================ */
/* Main Dashboard Page                          */
/* ============================================ */

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "sprints" | "projects">("overview");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const { setRoadmap, setAuditContext, roadmap: storeRoadmap } = useRoadmapStore();

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
        if (json.data.roadmap && !storeRoadmap) {
          const rm = json.data.roadmap;
          setRoadmap(
            {
              title: rm.title || "",
              estimated_duration: rm.estimatedDuration || "",
              difficulty: rm.difficulty || "",
              steps: (rm.steps as any[]) || [],
            },
            (rm.sourceType as "auto" | "manual") || "auto"
          );
          if (json.data.audit) {
            const audit = json.data.audit;
            const skillGaps = audit.atsKeywordAnalysis?.skill_gaps || [];
            const currentSkills = Object.keys(audit.skillMap || {});
            setAuditContext(skillGaps, currentSkills, rm.targetRole || "");
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (sprintId: number, taskId: string) => {
    const updatedData = { ...data };
    const taskIndex = updatedData.sprint.tasks.findIndex((t: any) => t.id === taskId);
    if (taskIndex !== -1) {
      const currentStatus = updatedData.sprint.tasks[taskIndex].completed;
      updatedData.sprint.tasks[taskIndex].completed = !currentStatus;
      setData(updatedData);
      try {
        await fetch("/api/dashboard/task/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sprintId, taskId }),
        });
      } catch (error) {
        const rollbackData = { ...data };
        rollbackData.sprint.tasks[taskIndex].completed = currentStatus;
        setData(rollbackData);
      }
    }
  };

  const processedSkillMap = useMemo(() => {
    if (!data?.audit?.skillMap) return [];
    return Object.entries(data.audit.skillMap).map(([subject, score]: [string, any]) => ({
      subject,
      A: score,
      fullMark: 100,
    }));
  }, [data]);

  const marketTrends = [
    { month: "Jan", revenue: 42, sessions: 35, conversion: 28 },
    { month: "Feb", revenue: 55, sessions: 48, conversion: 35 },
    { month: "Mar", revenue: 48, sessions: 42, conversion: 32 },
    { month: "Apr", revenue: 72, sessions: 60, conversion: 45 },
    { month: "May", revenue: 68, sessions: 55, conversion: 40 },
    { month: "Jun", revenue: 85, sessions: 70, conversion: 52 },
    { month: "Jul", revenue: 80, sessions: 65, conversion: 48 },
  ];

  const topPerformers = useMemo(() => {
    if (!data?.audit?.skillMap) return [];
    const entries = Object.entries(data.audit.skillMap);
    return entries
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, score]: [string, any]) => ({
        name,
        score,
      }));
  }, [data]);

  const barColors = ["#005BB7", "#020617", "#06B6D4", "#F59E0B", "#10B981"];

  const liveActivities: ActivityItem[] = [
    { id: "1", icon: Target, iconColor: "text-[#005BB7]", iconBg: "bg-blue-50", title: "Readiness Score Updated", description: "Your career readiness increased", time: "2m ago" },
    { id: "2", icon: CheckCircle2, iconColor: "text-emerald-500", iconBg: "bg-emerald-50", title: "Sprint Task Completed", description: "Finished weekly learning goal", time: "15m ago" },
    { id: "3", icon: Star, iconColor: "text-amber-500", iconBg: "bg-amber-50", title: "New Skill Unlocked", description: "Added to your profile", time: "1h ago" },
    { id: "4", icon: Flame, iconColor: "text-rose-500", iconBg: "bg-rose-50", title: "Streak Extended!", description: "Keep the momentum going", time: "2h ago" },
    { id: "5", icon: Eye, iconColor: "text-cyan-500", iconBg: "bg-cyan-50", title: "Profile Viewed", description: "Recruiter viewed your profile", time: "3h ago" },
    { id: "6", icon: ArrowUpRight, iconColor: "text-gray-900", iconBg: "bg-gray-100", title: "Market Demand Up", description: "Your target role trending +12%", time: "5h ago" },
  ];

  /* ============= LOADING STATE ============= */
  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-[#005BB7]" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[#9CA3AF] font-medium text-sm"
        >
          Loading your career intelligence...
        </motion.p>
      </div>
    );
  }

  /* ============= NO AUDIT STATE ============= */
  if (!data?.audit) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-[80vh] flex flex-col items-center justify-center text-center px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, delay: 0.2 }}
          className="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center mb-6"
        >
          <FileText className="w-10 h-10 text-[#005BB7]" />
        </motion.div>
        <h2 className="text-3xl font-extrabold text-[#020617] mb-3">
          No Career Audit Found
        </h2>
        <p className="text-[#9CA3AF] max-w-md mb-8 text-sm leading-relaxed">
          Upload your resume to generate your Career Intelligence Audit and
          unlock your personalized weekly sprints.
        </p>
        <Button
          asChild
          className="bg-[#005BB7] hover:bg-[#004B99] text-white rounded-2xl px-10 py-3 shadow-xl shadow-blue-200/50 font-bold"
        >
          <Link href="/dashboard/resume">
            Start Your Audit{" "}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </Button>
      </motion.div>
    );
  }

  const { audit, sprint, user, projects: userProjects } = data;
  const completionRate = sprint
    ? (sprint.tasks.filter((t: any) => t.completed).length /
        sprint.tasks.length) *
      100
    : 0;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-10 max-w-[1400px] mx-auto"
    >
      {/* ==================== HEADER ==================== */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#005BB7] rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] mb-3"
          >
            <Zap className="w-3 h-3 fill-current" /> CareerOS 2.0 Active
          </motion.div>
          <h1 className="text-3xl font-extrabold text-[#020617] tracking-tight leading-none">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-[#005BB7] to-[#020617] bg-clip-text text-transparent">
              {user.name?.split(" ")[0] || "Developer"}
            </span>
          </h1>
          <p className="text-[#9CA3AF] mt-2 text-sm font-medium">
            Your career intelligence dashboard is ready. Here&apos;s your overview.
          </p>
        </div>

        <motion.div
          variants={scaleIn}
          whileHover={{ y: -2 }}
          className="bg-white rounded-2xl px-5 py-3 flex items-center gap-4 border border-gray-100 shadow-sm"
        >
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#9CA3AF] font-bold">
              Current Streak
            </p>
            <p className="text-xl font-extrabold text-[#020617]">
              <AnimatedCounter value={user.streak || 0} suffix=" Days" />
            </p>
          </div>
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200/50"
          >
            <Trophy className="w-5 h-5 text-white" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ==================== KPI CARDS ==================== */}
      <motion.div
        variants={staggerContainer}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <KPICard
          title="Readiness Score"
          value={audit.readinessScore || 0}
          suffix="%"
          change={12.5}
          changeLabel="vs last assessment"
          icon={Target}
          iconColor="text-[#005BB7]"
          iconBg="bg-blue-50"
          index={0}
        />
        <KPICard
          title="Market Match"
          value={audit.marketMatchScore || 0}
          suffix="%"
          change={8.2}
          changeLabel="role alignment score"
          icon={TrendingUp}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-50"
          index={1}
        />
        <KPICard
          title="Sprint Progress"
          value={Math.round(completionRate)}
          suffix="%"
          change={completionRate > 50 ? 15.3 : -5.2}
          changeLabel={sprint ? `Week #${sprint.weekNumber}` : "No active sprint"}
          icon={Zap}
          iconColor="text-amber-500"
          iconBg="bg-amber-50"
          index={2}
        />
        <KPICard
          title="Project Quality"
          value={audit.projectQualityScore || 0}
          suffix="%"
          change={6.7}
          changeLabel="portfolio strength"
          icon={BarChart3}
          iconColor="text-gray-900"
          iconBg="bg-gray-100"
          index={3}
        />
      </motion.div>

      {/* ==================== MAIN GRID ==================== */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN — Charts & Sprint (8 cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Performance Trends Chart */}
          <motion.div
            variants={fadeUp}
            whileHover={{ boxShadow: "0 12px 40px -8px rgba(0,0,0,0.08)" }}
            className="bg-white rounded-[24px] border border-gray-100 p-6 transition-shadow"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-[#020617]">
                  Performance Trends
                </h3>
                <p className="text-[12px] text-[#9CA3AF] mt-0.5 font-medium">
                  Your career metrics over time
                </p>
              </div>
              <div className="flex bg-gray-50 rounded-xl p-1">
                {["7d", "30d", "90d"].map((range) => (
                  <button
                    key={range}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all text-[#9CA3AF] hover:text-[#4B5563] first:bg-white first:text-[#020617] first:shadow-sm"
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
              animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={marketTrends}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#020617" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#020617" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorConversion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid #f1f5f9",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Readiness"
                    stroke="#020617"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    name="Skills"
                    stroke="#06B6D4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorSessions)"
                  />
                  <Area
                    type="monotone"
                    dataKey="conversion"
                    name="Market"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorConversion)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-50">
              {[
                { label: "Readiness", color: "#020617" },
                { label: "Skills", color: "#06B6D4" },
                { label: "Market Fit", color: "#F59E0B" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: l.color }}
                  />
                  <span className="text-[11px] font-semibold text-[#9CA3AF]">
                    {l.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* === Two-column: Top Skills + Skill Radar === */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Performers / Skills bar chart */}
            <motion.div
              variants={fadeUp}
              whileHover={{ boxShadow: "0 12px 40px -8px rgba(0,0,0,0.08)" }}
              className="bg-white rounded-[24px] border border-gray-100 p-6"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <h3 className="text-lg font-bold text-[#020617] mb-1">
                Top Skills
              </h3>
              <p className="text-[12px] text-[#9CA3AF] font-medium mb-5">
                Your strongest competencies
              </p>

              <div className="space-y-4">
                {topPerformers.map((perf: any, i: number) => (
                  <motion.div
                    key={perf.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <span className="text-[12px] font-semibold text-[#4B5563] w-28 truncate">
                      {perf.name}
                    </span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${perf.score}%` }}
                        transition={{
                          duration: 1,
                          delay: 0.6 + i * 0.15,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${barColors[i]}, ${barColors[i]}dd)`,
                        }}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-[#020617] w-8 text-right">
                      {perf.score}
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Skill Radar */}
            <motion.div
              variants={fadeUp}
              whileHover={{ boxShadow: "0 12px 40px -8px rgba(0,0,0,0.08)" }}
              className="bg-white rounded-[24px] border border-gray-100 p-6"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <h3 className="text-lg font-bold text-[#020617] mb-1">
                Skill Radar
              </h3>
              <p className="text-[12px] text-[#9CA3AF] font-medium mb-2">
                Competency distribution
              </p>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="h-[220px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={processedSkillMap}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 10, fontWeight: 600, fill: "#9CA3AF" }}
                    />
                    <Radar
                      name="Skills"
                      dataKey="A"
                      stroke="#005BB7"
                      fill="#005BB7"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>
            </motion.div>
          </div>

          {/* === Weekly Sprint === */}
          <motion.div
            variants={fadeUp}
            className="bg-white rounded-[24px] border border-gray-100 overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            {/* Sprint header with tabs */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#020617]">
                  {sprint ? `Week #${sprint.weekNumber} Sprint` : "Weekly Sprint"}
                </h3>
                <p className="text-[12px] text-[#9CA3AF] font-medium mt-0.5">
                  AI-generated execution plan
                </p>
              </div>
              {sprint && (
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-bold text-[#005BB7]">
                    {Math.round(completionRate)}%
                  </span>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionRate}%` }}
                      transition={{ duration: 1.2, delay: 0.5 }}
                      className="h-full bg-[#005BB7] rounded-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {!sprint ? (
              <div className="px-6 pb-8 pt-4 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.3 }}
                  className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4"
                >
                  <Zap className="w-8 h-8 text-[#005BB7]" />
                </motion.div>
                <h4 className="text-lg font-bold text-[#020617]">No Active Sprint</h4>
                <p className="text-sm text-[#9CA3AF] mb-6">Your next weekly plan is ready to be generated.</p>
                <Button className="bg-[#005BB7] hover:bg-[#004B99] text-white rounded-xl shadow-lg shadow-blue-200/30 font-bold">
                  Generate Sprint
                </Button>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-50">
                  {sprint.tasks.map((task: any, i: number) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 300 }}
                      whileHover={{
                        backgroundColor: "rgba(240,247,255,0.5)",
                        x: 4,
                      }}
                      onClick={() => toggleTask(sprint.id, task.id)}
                      className="flex items-center group px-6 py-4 cursor-pointer transition-colors"
                    >
                      <motion.div
                        whileTap={{ scale: 0.85 }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 transition-all duration-300 ${
                          task.completed
                            ? "bg-emerald-50 text-emerald-500"
                            : "bg-gray-50 text-[#9CA3AF] group-hover:bg-blue-50 group-hover:text-[#005BB7]"
                        }`}
                      >
                        {task.completed ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500 }}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </motion.div>
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </motion.div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`text-[10px] uppercase font-bold tracking-[0.1em] ${
                              task.completed ? "text-emerald-400" : "text-[#005BB7]/60"
                            }`}
                          >
                            {task.type}
                          </span>
                          <span className="text-gray-200">•</span>
                          <span className="text-[10px] font-semibold text-[#9CA3AF]">
                            {task.time_estimate || "2h"}
                          </span>
                        </div>
                        <p
                          className={`font-semibold text-[14px] leading-tight ${
                            task.completed
                              ? "text-[#9CA3AF] line-through"
                              : "text-[#020617] group-hover:text-[#005BB7]"
                          }`}
                        >
                          {task.description}
                        </p>
                      </div>
                      <ArrowRight
                        className={`w-4 h-4 transition-all duration-200 ${
                          task.completed
                            ? "opacity-0"
                            : "opacity-0 group-hover:opacity-100 group-hover:translate-x-1 text-[#005BB7]"
                        }`}
                      />
                    </motion.div>
                  ))}
                </div>
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex justify-between items-center">
                  <p className="text-[12px] text-[#9CA3AF] font-medium">
                    Tasks refresh every <span className="text-[#005BB7] font-bold">Monday</span>
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={fetchDashboardData}
                    className="flex items-center gap-2 text-[12px] font-bold text-[#9CA3AF] hover:text-[#005BB7] transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>

          {/* === AI Intelligence Feed === */}
          <motion.div variants={fadeUp} className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#005BB7]" />
              <h3 className="text-lg font-bold text-[#020617]">AI Insights</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <motion.div
                whileHover={{ y: -3, boxShadow: "0 12px 30px -8px rgba(245,158,11,0.15)" }}
                className="bg-white rounded-[20px] border border-gray-100 p-5 flex items-start gap-4 relative overflow-hidden"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 rounded-r" />
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-[#020617] text-[14px]">
                    Skill Vulnerability
                  </p>
                  <p className="text-[12px] text-[#9CA3AF] mt-1 leading-relaxed">
                    {audit.atsKeywordAnalysis?.skill_gaps?.[0]
                      ? `Your lack of ${audit.atsKeywordAnalysis.skill_gaps[0]} is a risk factor.`
                      : "Analyzing skill vulnerabilities..."}
                  </p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -3, boxShadow: "0 12px 30px -8px rgba(0,91,183,0.15)" }}
                className="bg-white rounded-[20px] border border-gray-100 p-5 flex items-start gap-4 relative overflow-hidden"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[#005BB7] rounded-r" />
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-[#005BB7]" />
                </div>
                <div>
                  <p className="font-bold text-[#020617] text-[14px]">
                    Market Opportunity
                  </p>
                  <p className="text-[12px] text-[#9CA3AF] mt-1 leading-relaxed">
                    {audit.atsKeywordAnalysis?.market_alignment ||
                      "Analyzing market opportunities based on your profile..."}
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* === Quick Access Links === */}
          <motion.div variants={fadeUp} className="grid md:grid-cols-2 gap-4">
            <Link href="/dashboard/resources">
              <motion.div
                whileHover={{
                  y: -3,
                  boxShadow: "0 12px 30px -8px rgba(0,91,183,0.1)",
                }}
                className="bg-white rounded-[20px] border border-gray-100 p-5 flex items-center gap-4 cursor-pointer group"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center"
                >
                  <BookOpen className="w-5 h-5 text-[#005BB7]" />
                </motion.div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#020617] text-[14px] group-hover:text-[#005BB7] transition-colors">
                    Learning Resources
                  </h4>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                    Curated courses, videos & articles
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-200 group-hover:text-[#005BB7] group-hover:translate-x-1 transition-all" />
              </motion.div>
            </Link>

            <Link href="/dashboard/roadmap">
              <motion.div
                whileHover={{
                  y: -3,
                  boxShadow: "0 12px 30px -8px rgba(124,58,237,0.1)",
                }}
                className="bg-white rounded-[20px] border border-gray-100 p-5 flex items-center gap-4 cursor-pointer group"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center"
                >
                  <Map className="w-5 h-5 text-gray-900" />
                </motion.div>
                <div className="flex-1">
                  <h4 className="font-bold text-[#020617] text-[14px] group-hover:text-gray-900 transition-colors">
                    Learning Roadmap
                  </h4>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                    Step-by-step paths for any tech
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-200 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
              </motion.div>
            </Link>
          </motion.div>
        </div>

        {/* RIGHT COLUMN — Live Activity Feed (4 cols) */}
        <motion.div
          variants={fadeUp}
          className="lg:col-span-4"
        >
          <div
            className="bg-white rounded-[24px] border border-gray-100 p-5 lg:sticky lg:top-24"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-emerald-500"
                />
                <h3 className="text-[14px] font-bold text-[#020617]">
                  Live Activity
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.1em]">
                Real-time
              </span>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-1"
            >
              {liveActivities.map((item, i) => (
                <LiveActivityCard key={item.id} item={item} index={i} />
              ))}
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-[12px] font-bold text-[#9CA3AF] hover:text-[#4B5563] transition-colors"
            >
              View All Activity
            </motion.button>
          </div>

          {/* Project Ideas Mini-Card */}
          {userProjects && userProjects.length > 0 && (
            <motion.div
              variants={fadeUp}
              className="bg-white rounded-[24px] border border-gray-100 p-5 mt-6"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Rocket className="w-4 h-4 text-gray-900" />
                <h3 className="text-[14px] font-bold text-[#020617]">
                  Project Ideas
                </h3>
              </div>

              <div className="space-y-3">
                {userProjects.slice(0, 3).map((p: any) => (
                  <motion.div
                    key={p.id}
                    whileHover={{ x: 4 }}
                    className="p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <p className="text-[13px] font-semibold text-[#020617] group-hover:text-[#005BB7] transition-colors truncate">
                      {p.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {p.techStack?.slice(0, 2).map((tech: string) => (
                        <span
                          key={tech}
                          className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wider bg-white px-1.5 py-0.5 rounded border border-gray-100"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              <Link
                href="/dashboard/jobs"
                className="flex items-center gap-1 mt-3 text-[12px] font-bold text-[#005BB7] hover:text-[#004B99] transition-colors"
              >
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
