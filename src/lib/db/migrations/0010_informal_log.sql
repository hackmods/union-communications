CREATE TABLE "informal_log_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"bargaining_unit_id" text,
	"member_pseudonym" text,
	"topic" text NOT NULL,
	"channel" text NOT NULL,
	"summary" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"logged_by_id" text NOT NULL,
	"logged_by_name" text NOT NULL,
	"converted_to_grievance_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "informal_log_entries" ADD CONSTRAINT "informal_log_entries_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informal_log_entries" ADD CONSTRAINT "informal_log_entries_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "informal_log_entries" ADD CONSTRAINT "informal_log_entries_bargaining_unit_id_bargaining_units_id_fk" FOREIGN KEY ("bargaining_unit_id") REFERENCES "public"."bargaining_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "informal_log_union_local_idx" ON "informal_log_entries" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "informal_log_occurred_idx" ON "informal_log_entries" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "informal_log_converted_idx" ON "informal_log_entries" USING btree ("converted_to_grievance_id");--> statement-breakpoint
-- FUTURE-001 / ADR-008: Row-Level Security for informal log entries.
ALTER TABLE informal_log_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS informal_log_entries_tenant_isolation ON informal_log_entries;
CREATE POLICY informal_log_entries_tenant_isolation ON informal_log_entries
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
