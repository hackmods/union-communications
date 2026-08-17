-- Platform website feedback (ADR-018).
-- No tenant RLS: this is operator product mail, not union casework.
-- API RBAC (platform_admin) is the read boundary.
CREATE TABLE IF NOT EXISTS "platform_feedback_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"category" text NOT NULL,
	"body" text NOT NULL,
	"page_path" text,
	"locale" text NOT NULL,
	"source" text NOT NULL,
	"submitter_user_id" text,
	"contact_email" text,
	"contact_name" text,
	"consent_accepted_at" timestamp with time zone NOT NULL,
	"ip_hash" text,
	"status" text NOT NULL,
	"steward_note" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_feedback_status_idx" ON "platform_feedback_submissions" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_feedback_created_idx" ON "platform_feedback_submissions" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_feedback_category_idx" ON "platform_feedback_submissions" USING btree ("category");
