CREATE TABLE "union_meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"bargaining_unit_id" text,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"location" text NOT NULL,
	"public_blurb" text,
	"quorum_needed" integer,
	"hybrid" text NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvp_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvp_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"meeting_id" text NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"attending" text NOT NULL,
	"join_mode" text,
	"display_name" text NOT NULL,
	"email" text,
	"phone" text,
	"guests_on_site" integer,
	"dietary_note" text,
	"accessibility_note" text,
	"role_or_office" text,
	"source" text NOT NULL,
	"consent_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_hash" text
);
--> statement-breakpoint
ALTER TABLE "union_meetings" ADD CONSTRAINT "union_meetings_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "union_meetings" ADD CONSTRAINT "union_meetings_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_tokens" ADD CONSTRAINT "rsvp_tokens_meeting_id_union_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."union_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_responses" ADD CONSTRAINT "rsvp_responses_meeting_id_union_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."union_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_responses" ADD CONSTRAINT "rsvp_responses_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp_responses" ADD CONSTRAINT "rsvp_responses_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "union_meetings_union_local_idx" ON "union_meetings" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "union_meetings_starts_at_idx" ON "union_meetings" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvp_tokens_token_idx" ON "rsvp_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "rsvp_tokens_meeting_idx" ON "rsvp_tokens" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "rsvp_responses_meeting_idx" ON "rsvp_responses" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "rsvp_responses_union_local_idx" ON "rsvp_responses" USING btree ("union_id","local_id");--> statement-breakpoint
-- Calendar R1 / ADR-008 / ADR-015: Row-Level Security for tokenized RSVP.
ALTER TABLE union_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS union_meetings_tenant_isolation ON union_meetings;
CREATE POLICY union_meetings_tenant_isolation ON union_meetings
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS rsvp_tokens_tenant_isolation ON rsvp_tokens;
CREATE POLICY rsvp_tokens_tenant_isolation ON rsvp_tokens
  USING (
    EXISTS (
      SELECT 1 FROM union_meetings m
      WHERE m.id = rsvp_tokens.meeting_id
        AND m.union_id = nullif(current_setting('app.current_union_id', true), '')
        AND (
          m.local_id = nullif(current_setting('app.current_local_id', true), '')
          OR current_setting('app.current_cross_local', true) = 'true'
          OR nullif(current_setting('app.current_local_id', true), '') IS NULL
        )
    )
  );

DROP POLICY IF EXISTS rsvp_responses_tenant_isolation ON rsvp_responses;
CREATE POLICY rsvp_responses_tenant_isolation ON rsvp_responses
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
