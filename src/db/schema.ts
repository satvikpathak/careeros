import { pgTable, serial, text, integer, timestamp, jsonb, decimal, varchar, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique().notNull(),
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default("free"),
  streakCount: integer("streak_count").default(0),
  lastAuditAt: timestamp("last_audit_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const careerAudits = pgTable("career_audits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  readinessScore: integer("readiness_score"),
  marketMatchScore: integer("market_match_score"),
  projectQualityScore: integer("project_quality_score"),
  skillMap: jsonb("skill_map"), // { frontend: 80, backend: 60, ... }
  atsKeywordAnalysis: jsonb("ats_keyword_analysis"),
  githubAnalysis: jsonb("github_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const weeklySprints = pgTable("weekly_sprints", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  weekNumber: integer("week_number"),
  year: integer("year"),
  tasks: jsonb("tasks"), // Array of { id, type, description, status, outcome }
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const skillProgress = pgTable("skill_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  skillCategory: varchar("skill_category", { length: 100 }),
  score: integer("score"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: varchar("title", { length: 255 }),
  role: varchar("role", { length: 100 }),
  description: text("description"),
  techStack: jsonb("tech_stack"),
  features: jsonb("features"),
  architecture: jsonb("architecture"),
  deploymentGuide: text("deployment_guide"),
  resumePoints: jsonb("resume_points"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roadmaps = pgTable("roadmaps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: varchar("title", { length: 500 }),
  topic: varchar("topic", { length: 500 }),
  targetRole: varchar("target_role", { length: 255 }),
  estimatedDuration: varchar("estimated_duration", { length: 100 }),
  difficulty: varchar("difficulty", { length: 100 }),
  steps: jsonb("steps"), // Array of { phase, description, topics[], projects[], milestones[] }
  sourceType: varchar("source_type", { length: 20 }), // "auto" | "manual"
  completedPhases: jsonb("completed_phases"), // Record<number, boolean>
  topicChecklist: jsonb("topic_checklist"), // Record<number, Record<number, boolean>>
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
