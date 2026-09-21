-- Durable Local Portal records. Circle membership remains the application
-- relationship; 0043 adds the matching RLS boundary.
CREATE TABLE IF NOT EXISTS "portal_circles" (
  "id" text PRIMARY KEY NOT NULL, "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "local_id" text REFERENCES "locals"("id") ON DELETE CASCADE, "kind" text NOT NULL, "name" text NOT NULL,
  "description" text, "visibility" text NOT NULL, "front_starts_at" timestamp with time zone,
  "front_ends_at" timestamp with time zone, "archived_at" timestamp with time zone,
  "created_by_id" text NOT NULL, "created_at" timestamp with time zone NOT NULL, "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_circles_union_local_idx" ON "portal_circles" ("union_id","local_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_circle_memberships" (
  "id" text PRIMARY KEY NOT NULL, "circle_id" text NOT NULL REFERENCES "portal_circles"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL, "user_name" text NOT NULL, "role" text NOT NULL, "muted" boolean DEFAULT false NOT NULL,
  "muted_tools" jsonb DEFAULT '[]'::jsonb NOT NULL, "starred" boolean DEFAULT false NOT NULL, "joined_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portal_circle_memberships_circle_user_uidx" ON "portal_circle_memberships" ("circle_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_circle_memberships_user_idx" ON "portal_circle_memberships" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_bulletin_posts" (
  "id" text PRIMARY KEY NOT NULL, "circle_id" text NOT NULL REFERENCES "portal_circles"("id") ON DELETE CASCADE, "union_id" text NOT NULL,
  "author_id" text NOT NULL, "author_name" text NOT NULL, "title" text NOT NULL, "body" text NOT NULL, "pinned" boolean DEFAULT false NOT NULL,
  "deleted_at" timestamp with time zone, "created_at" timestamp with time zone NOT NULL, "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_bulletin_posts_circle_idx" ON "portal_bulletin_posts" ("circle_id","created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_bulletin_comments" (
  "id" text PRIMARY KEY NOT NULL, "post_id" text NOT NULL REFERENCES "portal_bulletin_posts"("id") ON DELETE CASCADE,
  "author_id" text NOT NULL, "author_name" text NOT NULL, "body" text NOT NULL, "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_bulletin_comments_post_idx" ON "portal_bulletin_comments" ("post_id","created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_actions" (
  "id" text PRIMARY KEY NOT NULL, "circle_id" text NOT NULL REFERENCES "portal_circles"("id") ON DELETE CASCADE, "union_id" text NOT NULL,
  "list_name" text NOT NULL, "title" text NOT NULL, "notes" text, "assignee_id" text, "assignee_name" text, "due_at" timestamp with time zone,
  "completed_at" timestamp with time zone, "deleted_at" timestamp with time zone, "source_bulletin_post_id" text, "created_by_id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL, "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_actions_circle_idx" ON "portal_actions" ("circle_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_actions_assignee_idx" ON "portal_actions" ("assignee_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_calendar_events" (
  "id" text PRIMARY KEY NOT NULL, "circle_id" text NOT NULL REFERENCES "portal_circles"("id") ON DELETE CASCADE, "union_id" text NOT NULL,
  "title" text NOT NULL, "description" text, "starts_at" timestamp with time zone NOT NULL, "ends_at" timestamp with time zone,
  "location" text, "external_url" text, "created_by_id" text NOT NULL, "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_calendar_events_circle_idx" ON "portal_calendar_events" ("circle_id","starts_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_binder_items" (
  "id" text PRIMARY KEY NOT NULL, "circle_id" text NOT NULL REFERENCES "portal_circles"("id") ON DELETE CASCADE, "union_id" text NOT NULL,
  "title" text NOT NULL, "folder" text, "content" text NOT NULL, "content_type" text NOT NULL, "created_by_id" text NOT NULL,
  "created_by_name" text NOT NULL, "deleted_at" timestamp with time zone, "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_binder_items_circle_idx" ON "portal_binder_items" ("circle_id","created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_floor_messages" (
  "id" text PRIMARY KEY NOT NULL, "circle_id" text NOT NULL REFERENCES "portal_circles"("id") ON DELETE CASCADE, "union_id" text NOT NULL,
  "author_id" text NOT NULL, "author_name" text NOT NULL, "body" text NOT NULL, "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_floor_messages_circle_idx" ON "portal_floor_messages" ("circle_id","created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_roll_call_questions" (
  "id" text PRIMARY KEY NOT NULL, "circle_id" text NOT NULL REFERENCES "portal_circles"("id") ON DELETE CASCADE, "union_id" text NOT NULL,
  "question" text NOT NULL, "cadence" text NOT NULL, "active" boolean DEFAULT true NOT NULL, "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_roll_call_questions_circle_idx" ON "portal_roll_call_questions" ("circle_id","created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_roll_call_answers" (
  "id" text PRIMARY KEY NOT NULL, "question_id" text NOT NULL REFERENCES "portal_roll_call_questions"("id") ON DELETE CASCADE,
  "circle_id" text NOT NULL REFERENCES "portal_circles"("id") ON DELETE CASCADE, "author_id" text NOT NULL, "author_name" text NOT NULL,
  "body" text NOT NULL, "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_roll_call_answers_circle_idx" ON "portal_roll_call_answers" ("circle_id","created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_pipeline_boards" (
  "id" text PRIMARY KEY NOT NULL, "circle_id" text NOT NULL REFERENCES "portal_circles"("id") ON DELETE CASCADE, "union_id" text NOT NULL, "name" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portal_pipeline_boards_circle_uidx" ON "portal_pipeline_boards" ("circle_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_pipeline_columns" (
  "id" text PRIMARY KEY NOT NULL, "board_id" text NOT NULL REFERENCES "portal_pipeline_boards"("id") ON DELETE CASCADE, "name" text NOT NULL, "position" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_pipeline_columns_board_idx" ON "portal_pipeline_columns" ("board_id","position");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_pipeline_cards" (
  "id" text PRIMARY KEY NOT NULL, "board_id" text NOT NULL REFERENCES "portal_pipeline_boards"("id") ON DELETE CASCADE,
  "column_id" text NOT NULL REFERENCES "portal_pipeline_columns"("id") ON DELETE CASCADE, "title" text NOT NULL, "body" text,
  "position" integer NOT NULL, "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_pipeline_cards_column_idx" ON "portal_pipeline_cards" ("column_id","position");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_dispatch_items" (
  "id" text PRIMARY KEY NOT NULL, "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE, "user_id" text NOT NULL,
  "circle_id" text NOT NULL REFERENCES "portal_circles"("id") ON DELETE CASCADE, "circle_name" text NOT NULL, "kind" text NOT NULL,
  "title" text NOT NULL, "body" text, "read_at" timestamp with time zone, "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_dispatch_user_idx" ON "portal_dispatch_items" ("union_id","user_id","read_at","created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_momentum_items" (
  "id" text PRIMARY KEY NOT NULL, "circle_id" text NOT NULL REFERENCES "portal_circles"("id") ON DELETE CASCADE, "union_id" text NOT NULL,
  "title" text NOT NULL, "notes" text, "progress" integer NOT NULL, "updated_by_id" text NOT NULL, "updated_by_name" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL, "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_momentum_circle_idx" ON "portal_momentum_items" ("circle_id","updated_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_sidebar_threads" (
  "id" text PRIMARY KEY NOT NULL, "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE, "created_by_id" text NOT NULL, "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_sidebar_threads_union_idx" ON "portal_sidebar_threads" ("union_id","updated_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_sidebar_participants" (
  "id" text PRIMARY KEY NOT NULL, "thread_id" text NOT NULL REFERENCES "portal_sidebar_threads"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL, "user_name" text NOT NULL, "position" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "portal_sidebar_participants_thread_user_uidx" ON "portal_sidebar_participants" ("thread_id","user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "portal_sidebar_messages" (
  "id" text PRIMARY KEY NOT NULL, "thread_id" text NOT NULL REFERENCES "portal_sidebar_threads"("id") ON DELETE CASCADE,
  "union_id" text NOT NULL, "author_id" text NOT NULL, "author_name" text NOT NULL, "body" text NOT NULL, "created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_sidebar_messages_thread_idx" ON "portal_sidebar_messages" ("thread_id","created_at");
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "circle_id" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_circle_idx" ON "audit_log" ("union_id","circle_id","timestamp");
