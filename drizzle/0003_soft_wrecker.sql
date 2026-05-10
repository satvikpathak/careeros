CREATE TABLE "cover_letters" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"jd_id" integer,
	"tone" varchar(30) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gap_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"jd_id" integer,
	"coverage" jsonb,
	"suggestions" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jds" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"source_url" varchar(1024),
	"content_hash" varchar(64) NOT NULL,
	"raw_text" text NOT NULL,
	"parsed" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resume_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"jd_id" integer,
	"source_kind" varchar(10) NOT NULL,
	"original_tex" text,
	"modified_tex" text,
	"rewritten_bullets" jsonb,
	"diff_segments" jsonb,
	"status" varchar(20) DEFAULT 'ready' NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_jd_id_jds_id_fk" FOREIGN KEY ("jd_id") REFERENCES "public"."jds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_reports" ADD CONSTRAINT "gap_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gap_reports" ADD CONSTRAINT "gap_reports_jd_id_jds_id_fk" FOREIGN KEY ("jd_id") REFERENCES "public"."jds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jds" ADD CONSTRAINT "jds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_jd_id_jds_id_fk" FOREIGN KEY ("jd_id") REFERENCES "public"."jds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "jds_user_hash_unique" ON "jds" USING btree ("user_id","content_hash");