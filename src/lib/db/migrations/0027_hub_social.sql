-- Discussions + tasks social stretch: mentions, reactions, updated_at on posts/tasks.
ALTER TABLE "discussion_posts" ADD COLUMN IF NOT EXISTS "mentioned_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD COLUMN IF NOT EXISTS "reactions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "discussion_posts" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "notes" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "mentioned_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "reactions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "tasks" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
