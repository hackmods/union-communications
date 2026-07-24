CREATE TABLE "election_cycles" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"title" text NOT NULL,
	"positions" jsonb NOT NULL,
	"status" text NOT NULL,
	"nominations" jsonb NOT NULL,
	"tallies" jsonb NOT NULL,
	"term_start" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "election_cycles" ADD CONSTRAINT "election_cycles_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "election_cycles" ADD CONSTRAINT "election_cycles_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "election_cycles_union_local_idx" ON "election_cycles" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "election_cycles_status_idx" ON "election_cycles" USING btree ("status");--> statement-breakpoint
-- ORG-003 / ADR-008: Row-Level Security for election cycles (no online voting).
ALTER TABLE election_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS election_cycles_tenant_isolation ON election_cycles;
CREATE POLICY election_cycles_tenant_isolation ON election_cycles
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
