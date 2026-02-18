// ============================================
// CareerOS 2.0 — Core Type Definitions
// ============================================

// ---- Database Entities (Drizzle) ----

export interface User {
  id: number;
  clerkId: string;
  name?: string;
  email: string;
  subscriptionTier: string;
  streakCount: number;
  lastAuditAt?: Date;
  createdAt: Date;
}

export interface CareerAudit {
  id: number;
  userId: number;
  readiness_score: number;
  market_match_score: number;
  project_quality_score: number;
  skill_map: Record<string, number>;
  skill_gaps: string[];
  depth_vs_breadth: string;
  ats_recommendations: string[];
  market_alignment_insights: string;
  github_analysis?: any;
  createdAt: Date;
}

export interface WeeklySprint {
  id: number;
  userId: number;
  weekNumber: number;
  year: number;
  tasks: SprintTask[];
  completionRate: number;
  createdAt: Date;
}

export interface SprintTask {
  id: string;
  type: "Skill Development" | "Portfolio Improvement" | "Networking" | "Interview Prep";
  description: string;
  time_estimate: string;
  measurable_outcome: string;
  completed: boolean;
}

export interface SkillProgress {
  id: number;
  userId: number;
  skillCategory: string;
  score: number;
  lastUpdated: Date;
}

export interface ProjectIdea {
  id: number;
  userId: number;
  title: string;
  role: string;
  description: string;
  techStack: string[];
  features: string[];
  architecture: string;
  deploymentGuide: string;
  resumePoints: string[];
  createdAt: Date;
}

// ---- AI / Gemini Types ----

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface PlacementAnalysis {
  company_specific_roadmap: string;
  dsa_topic_heatmap: Record<string, number>;
  hr_question_generator: string[];
  interview_readiness_score: number;
}

// ---- API Response Types ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---- Legacy Types (For Compatibility) ----

export interface Profile {
  id: string;
  userId: string;
  skills: string[];
  target_roles: TargetRole[];
  experience_years: number;
  risk_score: number;
  created_at: string;
  updated_at: string;
}

export interface ParsedResume {
  skills: string[];
  experience_years: string;
  education: Education[];
  projects: Project[];
  strength_score: number;
  missing_keywords: string[];
  summary?: string;
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
}

export interface TargetRole {
  title: string;
  priority: number;
}

export interface InterestCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  keywords: string[];
}

export interface ConversationProgress {
  stage: ProgressStage;
  percentage: number;
  stagesCompleted: string[];
  totalStages: number;
  currentStageLabel: string;
  isComplete: boolean;
}

export type ProgressStage =
  | "interests"
  | "strengths"
  | "education"
  | "preferences"
  | "goals"
  | "analysis";

export interface PathfinderAnalysis {
  recommended_careers: PathfinderCareer[];
  personality_traits: string[];
  interest_alignment: string[];
  strengths_identified: string[];
  exploration_areas: string[];
  roadmap: PathfinderRoadmapItem[];
}

export interface PathfinderCareer {
  title: string;
  match_score: number;
  why: string;
  salary_range: string;
  education_path: string;
  growth_outlook: string;
}

export interface PathfinderRoadmapItem {
  phase: number;
  title: string;
  description: string;
  duration: string;
  skills_to_learn: string[];
  resources_needed: string[];
}

export interface LearningResource {
  id: string;
  title: string;
  url: string;
  source: "youtube" | "coursera" | "udemy" | "freecodecamp" | "other";
  thumbnail?: string;
  channel?: string;
  duration?: string;
  rating?: number;
  description?: string;
}

export interface RoadmapWithResources {
  career_title: string;
  milestones: RoadmapMilestone[];
}

export interface RoadmapMilestone {
  id: string;
  phase: number;
  title: string;
  description: string;
  duration: string;
  skills: string[];
  resources: LearningResource[];
  isCompleted: boolean;
}
// ---- Market & Job Types ----

export interface Job {
  id: string;
  external_id?: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
  description?: string;
  url?: string;
  source: "linkedin" | "indeed" | "naukri" | "other";
  embedding?: number[];
  createdAt: Date;
}

export interface Match {
  id: string;
  userId: string;
  jobId: string;
  resumeId?: string;
  match_score: number;
  createdAt: Date;
  job?: Job;
}

export interface NormalizedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  description: string;
  url: string;
  source: "linkedin" | "indeed" | "naukri";
}
