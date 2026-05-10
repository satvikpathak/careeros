CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"dodo_subscription_id" varchar(255) NOT NULL,
	"dodo_customer_id" varchar(255) NOT NULL,
	"plan_key" varchar(50) NOT NULL,
	"status" varchar(30) NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"raw" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" varchar(50) NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(30) NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"received_at" timestamp DEFAULT now(),
	"payload" jsonb
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dodo_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_status" varchar(30);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_provider_external_unique" ON "webhook_events" USING btree ("provider","external_id");