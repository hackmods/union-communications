CREATE TABLE "poll_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"title" text NOT NULL,
	"intro" text,
	"questions" jsonb NOT NULL,
	"created_by_id" text NOT NULL,
	"status" text NOT NULL,
	"consent_required" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"poll_id" text NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consent_accepted_at" timestamp with time zone NOT NULL,
	"ip_hash" text
);
--> statement-breakpoint
ALTER TABLE "poll_definitions" ADD CONSTRAINT "poll_definitions_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_definitions" ADD CONSTRAINT "poll_definitions_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_poll_id_poll_definitions_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."poll_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "poll_definitions_slug_idx" ON "poll_definitions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "poll_definitions_union_local_idx" ON "poll_definitions" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "poll_responses_poll_idx" ON "poll_responses" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "poll_responses_union_local_idx" ON "poll_responses" USING btree ("union_id","local_id");--> statement-breakpoint
-- FUTURE-006 / ADR-008 / ADR-015: Row-Level Security for polls.
ALTER TABLE poll_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS poll_definitions_tenant_isolation ON poll_definitions;
CREATE POLICY poll_definitions_tenant_isolation ON poll_definitions
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS poll_responses_tenant_isolation ON poll_responses;
CREATE POLICY poll_responses_tenant_isolation ON poll_responses
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
