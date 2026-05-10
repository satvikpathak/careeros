CREATE TABLE "audit_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"progress" jsonb DEFAULT '{}'::jsonb,
	"s3_url" varchar(1024),
	"file_name" varchar(512),
	"target_role" varchar(255),
	"github_url" varchar(512),
	"error" text,
	"audit_id" integer,
	"created_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "career_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"readiness_score" integer,
	"market_match_score" integer,
	"project_quality_score" integer,
	"skill_map" jsonb,
	"ats_keyword_analysis" jsonb,
	"github_analysis" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" varchar(255),
	"role" varchar(100),
	"description" text,
	"tech_stack" jsonb,
	"features" jsonb,
	"architecture" jsonb,
	"deployment_guide" text,
	"resume_points" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roadmaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"title" varchar(500),
	"topic" varchar(500),
	"target_role" varchar(255),
	"estimated_duration" varchar(100),
	"difficulty" varchar(100),
	"steps" jsonb,
	"source_type" varchar(20),
	"completed_phases" jsonb,
	"topic_checklist" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "skill_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"skill_category" varchar(100),
	"score" integer,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_id" varchar(255) NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"subscription_tier" varchar(50) DEFAULT 'free',
	"streak_count" integer DEFAULT 0,
	"last_audit_at" timestamp,
	"onboarded_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weekly_sprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"week_number" integer,
	"year" integer,
	"tasks" jsonb,
	"completion_rate" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "audit_jobs" ADD CONSTRAINT "audit_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_jobs" ADD CONSTRAINT "audit_jobs_audit_id_career_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."career_audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_audits" ADD CONSTRAINT "career_audits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_progress" ADD CONSTRAINT "skill_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_sprints" ADD CONSTRAINT "weekly_sprints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;