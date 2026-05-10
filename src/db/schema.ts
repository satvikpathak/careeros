import { pgTable, serial, text, integer, timestamp, jsonb, decimal, varchar, boolean, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).unique().notNull(),
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default("free"),
  streakCount: integer("streak_count").default(0),
  lastAuditAt: timestamp("last_audit_at"),
  onboardedAt: timestamp("onboarded_at"),
  dodoCustomerId: varchar("dodo_customer_id", { length: 255 }),
  subscriptionStatus: varchar("subscription_status", { length: 30 }),
  currentPeriodEnd: timestamp("current_period_end"),
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

export const auditJobs = pgTable("audit_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("queued"),
  progress: jsonb("progress").default({}),
  s3Url: varchar("s3_url", { length: 1024 }),
  fileName: varchar("file_name", { length: 512 }),
  targetRole: varchar("target_role", { length: 255 }),
  githubUrl: varchar("github_url", { length: 512 }),
  error: text("error"),
  auditId: integer("audit_id").references(() => careerAudits.id),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
});

export const applications = pgTable(
  "applications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    jobTitle: varchar("job_title", { length: 512 }).notNull(),
    company: varchar("company", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }),
    sourceUrl: varchar("source_url", { length: 1024 }),
    jobSnapshot: jsonb("job_snapshot"),
    status: varchar("status", { length: 30 }).notNull().default("saved"),
    notes: text("notes"),
    appliedAt: timestamp("applied_at"),
    nextActionAt: timestamp("next_action_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const dailyCheckins = pgTable(
  "daily_checkins",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    checkinDate: varchar("checkin_date", { length: 10 }).notNull(),
    summary: text("summary"),
    applicationsSent: integer("applications_sent").default(0),
    hoursStudied: decimal("hours_studied", { precision: 4, scale: 1 }).default("0"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userDateUnique: uniqueIndex("daily_checkins_user_date_unique").on(t.userId, t.checkinDate),
  })
);

export const emailSubscriptions = pgTable(
  "email_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    kind: varchar("kind", { length: 50 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    userKindUnique: uniqueIndex("email_subscriptions_user_kind_unique").on(t.userId, t.kind),
  })
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull().unique(),
    dodoSubscriptionId: varchar("dodo_subscription_id", { length: 255 }).notNull(),
    dodoCustomerId: varchar("dodo_customer_id", { length: 255 }).notNull(),
    planKey: varchar("plan_key", { length: 50 }).notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  }
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    kind: varchar("kind", { length: 50 }).notNull(),
    occurredAt: timestamp("occurred_at").defaultNow().notNull(),
    metadata: jsonb("metadata"),
  }
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: serial("id").primaryKey(),
    provider: varchar("provider", { length: 30 }).notNull(),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    receivedAt: timestamp("received_at").defaultNow(),
    payload: jsonb("payload"),
  },
  (t) => ({
    providerExternalUnique: uniqueIndex("webhook_events_provider_external_unique").on(t.provider, t.externalId),
  })
);

export const jds = pgTable(
  "jds",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id).notNull(),
    sourceUrl: varchar("source_url", { length: 1024 }),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    rawText: text("raw_text").notNull(),
    parsed: jsonb("parsed"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userHashUnique: uniqueIndex("jds_user_hash_unique").on(t.userId, t.contentHash),
  })
);

export const resumeVersions = pgTable("resume_versions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jdId: integer("jd_id").references(() => jds.id),
  sourceKind: varchar("source_kind", { length: 10 }).notNull(),
  originalTex: text("original_tex"),
  modifiedTex: text("modified_tex"),
  rewrittenBullets: jsonb("rewritten_bullets"),
  diffSegments: jsonb("diff_segments"),
  status: varchar("status", { length: 20 }).notNull().default("ready"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const coverLetters = pgTable("cover_letters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jdId: integer("jd_id").references(() => jds.id),
  tone: varchar("tone", { length: 30 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gapReports = pgTable("gap_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jdId: integer("jd_id").references(() => jds.id),
  coverage: jsonb("coverage"),
  suggestions: jsonb("suggestions"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const outreachDrafts = pgTable("outreach_drafts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  jdId: integer("jd_id").references(() => jds.id),
  recipientName: varchar("recipient_name", { length: 255 }),
  recipientTitle: varchar("recipient_title", { length: 255 }),
  emailSubject: varchar("email_subject", { length: 512 }).notNull(),
  emailBody: text("email_body").notNull(),
  dmBody: text("dm_body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const simulations = pgTable("simulations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  targetSkills: jsonb("target_skills"),
  horizonMonths: integer("horizon_months").notNull(),
  series: jsonb("series"),
  suggestedSkills: jsonb("suggested_skills"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
