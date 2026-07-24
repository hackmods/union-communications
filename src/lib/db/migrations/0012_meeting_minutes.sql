CREATE TABLE "meeting_minutes" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"meeting_date" timestamp with time zone NOT NULL,
	"meeting_type" text NOT NULL,
	"attendees" jsonb NOT NULL,
	"motions" jsonb NOT NULL,
	"notes" text NOT NULL,
	"recorded_by_id" text NOT NULL,
	"recorded_by_name" text NOT NULL,
	"status" text NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meeting_minutes_union_local_idx" ON "meeting_minutes" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "meeting_minutes_date_idx" ON "meeting_minutes" USING btree ("meeting_date");--> statement-breakpoint
CREATE INDEX "meeting_minutes_status_idx" ON "meeting_minutes" USING btree ("status");--> statement-breakpoint
-- ORG-001 / ADR-008: Row-Level Security for meeting minutes.
ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meeting_minutes_tenant_isolation ON meeting_minutes;
CREATE POLICY meeting_minutes_tenant_isolation ON meeting_minutes
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
