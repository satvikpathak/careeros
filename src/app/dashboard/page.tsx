"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Shield,
  BarChart3,
  Target,
  Briefcase,
  ArrowUpRight,
  Bot,
  FileText,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { ROLE_CONFIGS, simulateSalaryGrowth, simulateMarketDemand } from "@/lib/constants";
import { useChatStore } from "@/stores/chat-store";
import { useProfileStore } from "@/stores/profile-store";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

export default function DashboardPage() {
  const [selectedRole, setSelectedRole] = useState("Software Engineer");
  const [yearsToSimulate, setYearsToSimulate] = useState(5);
  const { careerAnalysis } = useChatStore();
  const { parsedResume, atsScore } = useProfileStore();

  const roleConfig = ROLE_CONFIGS[selectedRole];
  const salaryData = useMemo(
    () => simulateSalaryGrowth(roleConfig.base_salary, roleConfig.growth_rate, yearsToSimulate),
    [roleConfig, yearsToSimulate]
  );
  const demandData = useMemo(
    () => simulateMarketDemand(roleConfig.market_demand),
    [roleConfig]
  );

  const skillDistribution = useMemo(() => {
    const skills = careerAnalysis?.skills_detected || parsedResume?.skills || roleConfig.top_skills;
    return skills.slice(0, 5).map((skill, i) => ({
      name: skill,
      value: 95 - i * 10 + Math.floor(Math.random() * 10),
    }));
  }, [careerAnalysis, parsedResume, roleConfig]);

  const topRoles = careerAnalysis?.top_roles || [
    { title: selectedRole, fit_score: 85, salary_range: `$${(roleConfig.base_salary / 1000).toFixed(0)}k - $${((roleConfig.base_salary * 1.3) / 1000).toFixed(0)}k`, risk_index: roleConfig.risk_level === "low" ? "Low" : "Medium", growth_rate: `${(roleConfig.growth_rate * 100).toFixed(0)}%` },
    { title: "Full Stack Developer", fit_score: 78, salary_range: "$95k - $140k", risk_index: "Low", growth_rate: "8%" },
    { title: "Cloud Architect", fit_score: 72, salary_range: "$130k - $180k", risk_index: "Low", growth_rate: "9%" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Career Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Your AI-powered career intelligence overview
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="glass-card" asChild>
              <Link href="/dashboard/chat">
                <Bot className="w-4 h-4 mr-1.5" /> AI Agent
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="glass-card" asChild>
              <Link href="/dashboard/resume">
                <FileText className="w-4 h-4 mr-1.5" /> Upload Resume
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        {[
          {
            label: "Top Role Fit",
            value: `${topRoles[0]?.fit_score || 0}%`,
            icon: Target,
            color: "text-indigo-500",
            bg: "bg-indigo-50",
          },
          {
            label: "Salary Range",
            value: topRoles[0]?.salary_range || "$0",
            icon: DollarSign,
            color: "text-emerald-500",
            bg: "bg-emerald-50",
          },
          {
            label: "Market Demand",
            value: `${roleConfig.market_demand}/100`,
            icon: TrendingUp,
            color: "text-blue-500",
            bg: "bg-blue-50",
          },
          {
            label: "Risk Index",
            value: topRoles[0]?.risk_index || "N/A",
            icon: Shield,
            color: "text-amber-500",
            bg: "bg-amber-50",
          },
        ].map((stat) => (
          <motion.div key={stat.label} variants={fadeIn}>
            <Card className="glass-card border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{stat.label}</p>
                    <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Salary Projection */}
        <motion.div className="lg:col-span-2" initial="hidden" animate="visible" variants={fadeIn}>
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">
                  Salary Projection
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Years:</span>
                  {[3, 5, 10].map((y) => (
                    <button
                      key={y}
                      onClick={() => setYearsToSimulate(y)}
                      className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                        yearsToSimulate === y
                          ? "bg-indigo-50 text-indigo-600 font-medium"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {y}yr
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={salaryData}>
                  <defs>
                    <linearGradient id="salaryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(255,255,255,0.9)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    }}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, "Salary"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="salary"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#salaryGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Roles */}
        <motion.div initial="hidden" animate="visible" variants={fadeIn}>
          <Card className="glass-card border-0 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">
                Top Role Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topRoles.map((role, i) => (
                <div
                  key={role.title}
                  className="p-3 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedRole(role.title in ROLE_CONFIGS ? role.title : selectedRole)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{role.title}</span>
                    <Badge variant="secondary" className="text-xs">
                      {role.fit_score}%
                    </Badge>
                  </div>
                  <Progress
                    value={role.fit_score}
                    className="h-1.5"
                  />
                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>{role.salary_range}</span>
                    <span className="flex items-center gap-0.5">
                      <ArrowUpRight className="w-3 h-3" /> {role.growth_rate}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Market Demand */}
        <motion.div initial="hidden" animate="visible" variants={fadeIn}>
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">
                Market Demand Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={demandData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(255,255,255,0.9)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar dataKey="demand" fill="#6366f1" radius={[6, 6, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Skill Distribution */}
        <motion.div initial="hidden" animate="visible" variants={fadeIn}>
          <Card className="glass-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-900">
                Top Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={skillDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {skillDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {skillDistribution.map((skill, i) => (
                    <div key={skill.name} className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-xs text-gray-600 flex-1">{skill.name}</span>
                      <span className="text-xs font-medium text-gray-900">{skill.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Role Selector */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <Card className="glass-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">
              Explore Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.keys(ROLE_CONFIGS).map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    selectedRole === role
                      ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
