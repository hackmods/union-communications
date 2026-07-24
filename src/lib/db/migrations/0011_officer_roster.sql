CREATE TABLE "officer_roster" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"term_start" text NOT NULL,
	"term_end" text,
	"email" text,
	"phone" text,
	"committees" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "officer_roster" ADD CONSTRAINT "officer_roster_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_roster" ADD CONSTRAINT "officer_roster_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "officer_roster_union_local_idx" ON "officer_roster" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "officer_roster_term_end_idx" ON "officer_roster" USING btree ("term_end");--> statement-breakpoint
-- ORG-002 / ADR-008: Row-Level Security for officer roster.
ALTER TABLE officer_roster ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS officer_roster_tenant_isolation ON officer_roster;
CREATE POLICY officer_roster_tenant_isolation ON officer_roster
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
