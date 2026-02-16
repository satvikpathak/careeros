// ============================================
// CareerOS — Core Type Definitions
// ============================================

// ---- Database Entities ----

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  skills: string[];
  target_roles: TargetRole[];
  experience_years: number;
  risk_score: number;
  career_analysis: CareerAnalysis | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  status: "active" | "completed" | "archived";
  extracted_profile: CareerAnalysis | null;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  s3_url: string;
  file_name: string;
  parsed_data: ParsedResume;
  ats_score: number;
  embedding?: number[];
  created_at: string;
  updated_at: string;
}

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
  created_at: string;
}

export interface Match {
  id: string;
  user_id: string;
  job_id: string;
  resume_id?: string;
  match_score: number;
  created_at: string;
  job?: Job; // joined
}

// ---- AI / Gemini Types ----

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface CareerAnalysis {
  top_roles: TopRole[];
  skills_detected: string[];
  skill_gaps: string[];
  recommended_roadmap: RoadmapItem[];
}

export interface TopRole {
  title: string;
  fit_score: number;
  salary_range: string;
  risk_index: string;
  growth_rate: string;
}

export interface RoadmapItem {
  step: number;
  title: string;
  description: string;
  duration: string;
  resources: string[];
}

export interface TargetRole {
  title: string;
  priority: number;
}

// ---- Resume Parsing ----

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

// ---- Job Search ----

export interface JobSearchParams {
  query: string;
  location?: string;
  page?: number;
  source?: "linkedin" | "indeed" | "naukri" | "all";
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

// ---- Simulation ----

export interface SalarySimulation {
  year: number;
  salary: number;
  role: string;
}

export interface MarketDemand {
  month: string;
  demand: number;
  role: string;
}

// ---- API Response Types ----

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StreamChunk {
  type: "text" | "json" | "done" | "error";
  content: string;
}

// ---- Role Config (Static MVP Data) ----

export interface RoleConfig {
  title: string;
  base_salary: number;
  growth_rate: number;
  market_demand: number;
  risk_level: "low" | "medium" | "high";
  top_skills: string[];
}

// ---- Career Pathfinder ----

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

// ---- Learning Resources ----

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
