-- Hub Bylaws drafts + Proposal casework + Portal-safe publications.

CREATE TABLE IF NOT EXISTS "bylaw_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"mode" text DEFAULT 'template' NOT NULL,
	"form" jsonb NOT NULL,
	"updated_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposal_packages" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"bargaining_unit_id" text,
	"name" text NOT NULL,
	"round_label" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"caucus_note" text DEFAULT '' NOT NULL,
	"published_at" timestamp with time zone,
	"published_summary" jsonb,
	"created_by_id" text NOT NULL,
	"updated_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposal_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"package_id" text NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"article" text DEFAULT '' NOT NULL,
	"current_language" text DEFAULT '' NOT NULL,
	"union_proposal" text DEFAULT '' NOT NULL,
	"employer_counter" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"assignee_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposal_events" (
	"id" text PRIMARY KEY NOT NULL,
	"package_id" text NOT NULL,
	"row_id" text,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"kind" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposal_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"package_id" text NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"headline" text NOT NULL,
	"bullets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"guide_href" text,
	"published_by_id" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bylaw_drafts" ADD CONSTRAINT "bylaw_drafts_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bylaw_drafts" ADD CONSTRAINT "bylaw_drafts_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_packages" ADD CONSTRAINT "proposal_packages_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_packages" ADD CONSTRAINT "proposal_packages_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_packages" ADD CONSTRAINT "proposal_packages_bargaining_unit_id_bargaining_units_id_fk" FOREIGN KEY ("bargaining_unit_id") REFERENCES "public"."bargaining_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_rows" ADD CONSTRAINT "proposal_rows_package_id_proposal_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."proposal_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_rows" ADD CONSTRAINT "proposal_rows_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_rows" ADD CONSTRAINT "proposal_rows_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_events" ADD CONSTRAINT "proposal_events_package_id_proposal_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."proposal_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_events" ADD CONSTRAINT "proposal_events_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_events" ADD CONSTRAINT "proposal_events_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_publications" ADD CONSTRAINT "proposal_publications_package_id_proposal_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."proposal_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_publications" ADD CONSTRAINT "proposal_publications_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_publications" ADD CONSTRAINT "proposal_publications_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bylaw_drafts_union_local_idx" ON "bylaw_drafts" USING btree ("union_id","local_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bylaw_drafts_status_idx" ON "bylaw_drafts" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposal_packages_union_local_idx" ON "proposal_packages" USING btree ("union_id","local_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposal_packages_status_idx" ON "proposal_packages" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposal_rows_package_idx" ON "proposal_rows" USING btree ("package_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposal_rows_union_local_idx" ON "proposal_rows" USING btree ("union_id","local_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposal_events_package_idx" ON "proposal_events" USING btree ("package_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposal_events_union_local_idx" ON "proposal_events" USING btree ("union_id","local_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposal_publications_union_local_idx" ON "proposal_publications" USING btree ("union_id","local_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposal_publications_package_idx" ON "proposal_publications" USING btree ("package_id");
--> statement-breakpoint
ALTER TABLE bylaw_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_publications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY bylaw_drafts_tenant_isolation ON bylaw_drafts
  FOR ALL USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  )
  WITH CHECK (
    union_id = nullif(current_setting('app.current_union_id', true), '')
  );
--> statement-breakpoint
CREATE POLICY proposal_packages_tenant_isolation ON proposal_packages
  FOR ALL USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  )
  WITH CHECK (
    union_id = nullif(current_setting('app.current_union_id', true), '')
  );
--> statement-breakpoint
CREATE POLICY proposal_rows_tenant_isolation ON proposal_rows
  FOR ALL USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  )
  WITH CHECK (
    union_id = nullif(current_setting('app.current_union_id', true), '')
  );
--> statement-breakpoint
CREATE POLICY proposal_events_tenant_isolation ON proposal_events
  FOR ALL USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  )
  WITH CHECK (
    union_id = nullif(current_setting('app.current_union_id', true), '')
  );
--> statement-breakpoint
CREATE POLICY proposal_publications_tenant_isolation ON proposal_publications
  FOR ALL USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  )
  WITH CHECK (
    union_id = nullif(current_setting('app.current_union_id', true), '')
  );
