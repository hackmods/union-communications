-- Site Admin / platform-operator surface (2026-09-17).
--
-- Lifecycle / archive columns on `users`, `unions`, `divisions`, `locals`.
-- `is_demo` runtime registry on the same tables — backfilled by
-- `data-migrations/0001_site_admin_backfill.sql` (idempotent).
-- `email_change_tokens` for the 2-token email-change grant/confirm flow.
-- `audit_log.metadata` JSONB so platform-admin actions persist structured
-- info that's not just an action / resource foreign key.
--
-- FK change: `users.union_id` loosens from `restrict` to `set null` so an
-- archived user can be freed from a frozen union before eventual hard delete.
-- NOTE: do NOT run `npm run db:generate` against this journal without review
-- — this migration is hand-maintained and the column additions mirror the
-- Drizzle schema in `src/lib/db/schema/tenant.ts`.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "archived_by_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_by_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "unions" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "unions" ADD COLUMN IF NOT EXISTS "archived_by_id" text;--> statement-breakpoint
ALTER TABLE "unions" ADD COLUMN IF NOT EXISTS "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN IF NOT EXISTS "archived_by_id" text;--> statement-breakpoint
ALTER TABLE "divisions" ADD COLUMN IF NOT EXISTS "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "locals" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "locals" ADD COLUMN IF NOT EXISTS "archived_by_id" text;--> statement-breakpoint
ALTER TABLE "locals" ADD COLUMN IF NOT EXISTS "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_union_id_unions_id_fk";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_is_demo_idx" ON "users" USING btree ("is_demo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_archived_at_idx" ON "users" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unions_is_demo_idx" ON "unions" USING btree ("is_demo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "locals_is_demo_idx" ON "locals" USING btree ("is_demo");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_change_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"email" text NOT NULL,
	"user_id" text NOT NULL,
	"new_email" text NOT NULL,
	"invited_by_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_change_tokens_token_idx" ON "email_change_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_change_tokens_email_idx" ON "email_change_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_change_tokens_user_id_idx" ON "email_change_tokens" USING btree ("user_id");
