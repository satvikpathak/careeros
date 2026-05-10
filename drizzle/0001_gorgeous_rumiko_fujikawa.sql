CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"job_title" varchar(512) NOT NULL,
	"company" varchar(255) NOT NULL,
	"location" varchar(255),
	"source_url" varchar(1024),
	"job_snapshot" jsonb,
	"status" varchar(30) DEFAULT 'saved' NOT NULL,
	"notes" text,
	"applied_at" timestamp,
	"next_action_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"checkin_date" varchar(10) NOT NULL,
	"summary" text,
	"applications_sent" integer DEFAULT 0,
	"hours_studied" numeric(4, 1) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" varchar(50) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_checkins" ADD CONSTRAINT "daily_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_subscriptions" ADD CONSTRAINT "email_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_checkins_user_date_unique" ON "daily_checkins" USING btree ("user_id","checkin_date");--> statement-breakpoint
CREATE UNIQUE INDEX "email_subscriptions_user_kind_unique" ON "email_subscriptions" USING btree ("user_id","kind");