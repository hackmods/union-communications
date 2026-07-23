CREATE TABLE "discussion_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"bargaining_unit_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"grievance_id" text,
	"bumping_case_id" text,
	"created_by_id" text NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_post_at" timestamp with time zone DEFAULT now() NOT NULL,
	"post_count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_bargaining_unit_id_bargaining_units_id_fk" FOREIGN KEY ("bargaining_unit_id") REFERENCES "public"."bargaining_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discussion_threads_union_local_idx" ON "discussion_threads" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "discussion_threads_last_post_idx" ON "discussion_threads" USING btree ("last_post_at");--> statement-breakpoint
CREATE INDEX "discussion_threads_grievance_idx" ON "discussion_threads" USING btree ("grievance_id");--> statement-breakpoint
CREATE INDEX "discussion_threads_bumping_idx" ON "discussion_threads" USING btree ("bumping_case_id");--> statement-breakpoint
CREATE INDEX "discussion_posts_thread_idx" ON "discussion_posts" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "discussion_posts_union_local_idx" ON "discussion_posts" USING btree ("union_id","local_id");--> statement-breakpoint
-- FEAT-002 / ADR-008: Row-Level Security for discussion tables.
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS discussion_threads_tenant_isolation ON discussion_threads;
CREATE POLICY discussion_threads_tenant_isolation ON discussion_threads
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS discussion_posts_tenant_isolation ON discussion_posts;
CREATE POLICY discussion_posts_tenant_isolation ON discussion_posts
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
