CREATE TABLE "ca_snippets" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text,
	"bargaining_unit_id" text,
	"title" text NOT NULL,
	"clause_ref" text NOT NULL,
	"body" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_id" text NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ca_snippets" ADD CONSTRAINT "ca_snippets_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ca_snippets" ADD CONSTRAINT "ca_snippets_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ca_snippets" ADD CONSTRAINT "ca_snippets_bargaining_unit_id_bargaining_units_id_fk" FOREIGN KEY ("bargaining_unit_id") REFERENCES "public"."bargaining_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ca_snippets_union_idx" ON "ca_snippets" USING btree ("union_id");--> statement-breakpoint
CREATE INDEX "ca_snippets_union_local_idx" ON "ca_snippets" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "ca_snippets_clause_ref_idx" ON "ca_snippets" USING btree ("union_id","clause_ref");--> statement-breakpoint
-- CA snippets / ADR-008: Row-Level Security with tenant isolation.
-- Union-wide rows (local_id IS NULL) are visible to any member of the union.
ALTER TABLE ca_snippets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ca_snippets_tenant_isolation ON ca_snippets;
CREATE POLICY ca_snippets_tenant_isolation ON ca_snippets
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id IS NULL
      OR local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
