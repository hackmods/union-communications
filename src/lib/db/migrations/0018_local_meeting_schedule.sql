CREATE TABLE "local_meeting_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"recurrence" text NOT NULL,
	"day_of_month" integer,
	"weekday" integer,
	"nth_week_of_month" integer,
	"custom_dates" jsonb,
	"time" text NOT NULL,
	"duration_minutes" integer DEFAULT 90 NOT NULL,
	"location" text NOT NULL,
	"public_blurb" text,
	"timezone" text NOT NULL,
	"public_slug" text NOT NULL,
	"updated_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "local_meeting_schedules" ADD CONSTRAINT "local_meeting_schedules_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_meeting_schedules" ADD CONSTRAINT "local_meeting_schedules_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "local_meeting_schedules_local_idx" ON "local_meeting_schedules" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE UNIQUE INDEX "local_meeting_schedules_slug_idx" ON "local_meeting_schedules" USING btree ("public_slug");--> statement-breakpoint
-- Calendar & Meetings Phase A / ADR-008 / ADR-015: Row-Level Security.
-- Not confidential (no member PII), but scoped by tenant like every other table.
ALTER TABLE local_meeting_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS local_meeting_schedules_tenant_isolation ON local_meeting_schedules;
CREATE POLICY local_meeting_schedules_tenant_isolation ON local_meeting_schedules
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
