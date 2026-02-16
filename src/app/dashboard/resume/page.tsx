"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  BarChart3,
  BookOpen,
  Code,
  Briefcase,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useProfileStore } from "@/stores/profile-store";
import type { ParsedResume } from "@/lib/types";
import { ROLE_CONFIGS, calculateATSScore } from "@/lib/constants";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ResumePage() {
  const {
    parsedResume,
    atsScore,
    isUploading,
    isParsing,
    setParsedResume,
    setAtsScore,
    setUploading,
    setParsing,
  } = useProfileStore();

  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("Software Engineer");

  const processFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be under 10MB.");
      return;
    }

    setError(null);
    setFileName(file.name);
    setUploading(true);
    setParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/resume", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        const parsed: ParsedResume = data.data.parsed_data;
        setParsedResume(parsed);

        // Calculate ATS score
        const roleConfig = ROLE_CONFIGS[selectedRole];
        if (roleConfig) {
          const ats = calculateATSScore(
            parsed.skills || [],
            roleConfig.top_skills,
            parseInt(parsed.experience_years || "0")
          );
          setAtsScore(ats.score);
        }
      } else {
        setError(data.error || "Failed to parse resume");
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setParsing(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files?.[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [selectedRole]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processFile(e.target.files[0]);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <h1 className="text-2xl font-bold text-gray-900">Resume Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload your resume for AI-powered parsing and ATS scoring
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Upload Area */}
        <motion.div className="lg:col-span-2" initial="hidden" animate="visible" variants={fadeIn}>
          <Card className="glass-card border-0">
            <CardContent className="p-6">
              {/* Drop zone */}
              <label
                className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
                  dragActive
                    ? "border-indigo-400 bg-indigo-50/50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleChange}
                  className="hidden"
                  disabled={isUploading || isParsing}
                />

                {isUploading || isParsing ? (
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">
                      {isUploading ? "Uploading..." : "Analyzing with AI..."}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">This may take a moment</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">
                      Drop your resume here
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF format, up to 10MB
                    </p>
                  </div>
                )}
              </label>

              {/* File name */}
              {fileName && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-gray-50 rounded-xl">
                  <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-sm text-gray-700 truncate flex-1">
                    {fileName}
                  </span>
                  {parsedResume && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 rounded-xl text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Target Role Selector */}
              <div className="mt-6">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Target Role for ATS Scoring
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.keys(ROLE_CONFIGS).slice(0, 6).map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        setSelectedRole(role);
                        if (parsedResume) {
                          const config = ROLE_CONFIGS[role];
                          const ats = calculateATSScore(
                            parsedResume.skills,
                            config.top_skills,
                            parseInt(parsedResume.experience_years || "0")
                          );
                          setAtsScore(ats.score);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        selectedRole === role
                          ? "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ATS Score Card */}
          <AnimatePresence>
            {parsedResume && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <Card className="glass-card border-0">
                  <CardContent className="p-6 text-center">
                    <h3 className="text-sm font-medium text-gray-400 mb-4">ATS SCORE</h3>
                    {/* Circular progress */}
                    <div className="relative w-32 h-32 mx-auto mb-4">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke="#f1f5f9"
                          strokeWidth="10"
                        />
                        <motion.circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="none"
                          stroke={atsScore >= 80 ? "#10b981" : atsScore >= 60 ? "#f59e0b" : "#ef4444"}
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={`${(atsScore / 100) * 314} 314`}
                          initial={{ strokeDasharray: "0 314" }}
                          animate={{ strokeDasharray: `${(atsScore / 100) * 314} 314` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-3xl font-bold ${getScoreColor(atsScore)}`}>
                          {atsScore}
                        </span>
                        <span className="text-xs text-gray-400">/ 100</span>
                      </div>
                    </div>
                    <Badge
                      variant={atsScore >= 80 ? "default" : atsScore >= 60 ? "secondary" : "destructive"}
                    >
                      {getScoreLabel(atsScore)}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-2">
                      For: {selectedRole}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results Panel */}
        <motion.div className="lg:col-span-3" initial="hidden" animate="visible" variants={fadeIn}>
          <AnimatePresence mode="wait">
            {parsedResume ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Strength Score */}
                <Card className="glass-card border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-500" />
                      Resume Strength
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Progress value={parsedResume.strength_score} className="flex-1 h-2" />
                      <span className="text-lg font-bold text-gray-900">
                        {parsedResume.strength_score}/100
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Skills */}
                <Card className="glass-card border-0">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Code className="w-4 h-4 text-purple-500" />
                      Skills Extracted
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {parsedResume.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Experience & Education */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card className="glass-card border-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-emerald-500" />
                        Experience
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-gray-900">
                        {parsedResume.experience_years} years
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="glass-card border-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                        Education
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {parsedResume.education.map((edu, i) => (
                          <div key={i}>
                            <p className="text-sm font-medium text-gray-900">{edu.degree}</p>
                            <p className="text-xs text-gray-400">
                              {edu.institution} • {edu.year}
                            </p>
                          </div>
                        ))}
                        {parsedResume.education.length === 0 && (
                          <p className="text-sm text-gray-400">No education data found</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Projects */}
                {parsedResume.projects.length > 0 && (
                  <Card className="glass-card border-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Target className="w-4 h-4 text-amber-500" />
                        Projects
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {parsedResume.projects.map((project, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-sm font-medium text-gray-900">{project.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{project.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {project.technologies.map((tech) => (
                              <Badge key={tech} variant="outline" className="text-[10px]">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Missing Keywords */}
                {parsedResume.missing_keywords.length > 0 && (
                  <Card className="glass-card border-0">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-rose-500" />
                        Missing Keywords
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-400 mb-3">
                        Add these keywords to improve your ATS score:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {parsedResume.missing_keywords.map((keyword) => (
                          <Badge key={keyword} variant="destructive" className="text-xs font-normal">
                            + {keyword}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <FileText className="w-16 h-16 text-gray-200 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Upload your resume
                </h3>
                <p className="text-sm text-gray-400 max-w-md">
                  Drop a PDF file in the upload area to get AI-powered resume analysis
                  including skill extraction, ATS scoring, and improvement recommendations.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
