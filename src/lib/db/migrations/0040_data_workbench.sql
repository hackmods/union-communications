CREATE TABLE "data_assertions" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"person_id" text NOT NULL,
	"run_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"field_key" text NOT NULL,
	"value" jsonb NOT NULL,
	"effective_from" text,
	"effective_to" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decision" text DEFAULT 'accepted' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_datasets" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"fields" jsonb NOT NULL,
	"mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mapping_version" integer DEFAULT 1 NOT NULL,
	"active_revision" integer DEFAULT 0 NOT NULL,
	"trusted_source" boolean DEFAULT false NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_employment_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"person_id" text NOT NULL,
	"run_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"employer" text DEFAULT '' NOT NULL,
	"job_title" text DEFAULT '' NOT NULL,
	"worksite" text DEFAULT '' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"supervisor_name" text DEFAULT '' NOT NULL,
	"position_key" text DEFAULT '' NOT NULL,
	"supervisor_person_id" text,
	"effective_from" text,
	"effective_to" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_identifiers" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"person_id" text NOT NULL,
	"namespace" text NOT NULL,
	"value" text NOT NULL,
	"source_run_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_import_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"dataset_id" text NOT NULL,
	"file_name" text NOT NULL,
	"content_hash" text NOT NULL,
	"storage_key" text NOT NULL,
	"scan_status" text NOT NULL,
	"sheet_name" text DEFAULT '' NOT NULL,
	"mapping" jsonb NOT NULL,
	"mapping_version" integer NOT NULL,
	"status" text NOT NULL,
	"row_count" integer NOT NULL,
	"accepted_count" integer DEFAULT 0 NOT NULL,
	"held_count" integer DEFAULT 0 NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "data_people" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"display_name" text NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_publications" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"dataset_id" text NOT NULL,
	"run_id" text NOT NULL,
	"revision" integer NOT NULL,
	"accepted_count" integer NOT NULL,
	"published_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_records" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"dataset_id" text NOT NULL,
	"publication_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"values" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_staged_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"run_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"raw_values" jsonb NOT NULL,
	"mapped_values" jsonb NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"match_person_id" text,
	"match_reason" text,
	"decision" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_union_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"person_id" text NOT NULL,
	"run_id" text NOT NULL,
	"member_number" text NOT NULL,
	"effective_from" text,
	"effective_to" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE data_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_staged_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_assertions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_employment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_union_memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY data_datasets_tenant_isolation ON data_datasets FOR ALL
  USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'))
  WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'));
--> statement-breakpoint
CREATE POLICY data_import_runs_tenant_isolation ON data_import_runs FOR ALL
  USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'))
  WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'));
--> statement-breakpoint
CREATE POLICY data_staged_rows_tenant_isolation ON data_staged_rows FOR ALL
  USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'))
  WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'));
--> statement-breakpoint
CREATE POLICY data_publications_tenant_isolation ON data_publications FOR ALL
  USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'))
  WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'));
--> statement-breakpoint
CREATE POLICY data_records_tenant_isolation ON data_records FOR ALL
  USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'))
  WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'));
--> statement-breakpoint
CREATE POLICY data_people_tenant_isolation ON data_people FOR ALL
  USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'))
  WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'));
--> statement-breakpoint
CREATE POLICY data_identifiers_tenant_isolation ON data_identifiers FOR ALL
  USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'))
  WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'));
--> statement-breakpoint
CREATE POLICY data_assertions_tenant_isolation ON data_assertions FOR ALL
  USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'))
  WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'));
--> statement-breakpoint
CREATE POLICY data_employment_assignments_tenant_isolation ON data_employment_assignments FOR ALL
  USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'))
  WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'));
--> statement-breakpoint
CREATE POLICY data_union_memberships_tenant_isolation ON data_union_memberships FOR ALL
  USING (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'))
  WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '') AND (local_id = nullif(current_setting('app.current_local_id', true), '') OR current_setting('app.current_cross_local', true) = 'true'));
ALTER TABLE "data_assertions" ADD CONSTRAINT "data_assertions_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_assertions" ADD CONSTRAINT "data_assertions_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_assertions" ADD CONSTRAINT "data_assertions_person_id_data_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "data_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_assertions" ADD CONSTRAINT "data_assertions_run_id_data_import_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "data_import_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_datasets" ADD CONSTRAINT "data_datasets_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_datasets" ADD CONSTRAINT "data_datasets_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_employment_assignments" ADD CONSTRAINT "data_employment_assignments_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_employment_assignments" ADD CONSTRAINT "data_employment_assignments_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_employment_assignments" ADD CONSTRAINT "data_employment_assignments_person_id_data_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "data_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_employment_assignments" ADD CONSTRAINT "data_employment_assignments_run_id_data_import_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "data_import_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_identifiers" ADD CONSTRAINT "data_identifiers_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_identifiers" ADD CONSTRAINT "data_identifiers_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_identifiers" ADD CONSTRAINT "data_identifiers_person_id_data_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "data_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_identifiers" ADD CONSTRAINT "data_identifiers_source_run_id_data_import_runs_id_fk" FOREIGN KEY ("source_run_id") REFERENCES "data_import_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_import_runs" ADD CONSTRAINT "data_import_runs_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_import_runs" ADD CONSTRAINT "data_import_runs_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_import_runs" ADD CONSTRAINT "data_import_runs_dataset_id_data_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "data_datasets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_people" ADD CONSTRAINT "data_people_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_people" ADD CONSTRAINT "data_people_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_publications" ADD CONSTRAINT "data_publications_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_publications" ADD CONSTRAINT "data_publications_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_publications" ADD CONSTRAINT "data_publications_dataset_id_data_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "data_datasets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_publications" ADD CONSTRAINT "data_publications_run_id_data_import_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "data_import_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_records" ADD CONSTRAINT "data_records_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_records" ADD CONSTRAINT "data_records_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_records" ADD CONSTRAINT "data_records_dataset_id_data_datasets_id_fk" FOREIGN KEY ("dataset_id") REFERENCES "data_datasets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_records" ADD CONSTRAINT "data_records_publication_id_data_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "data_publications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_staged_rows" ADD CONSTRAINT "data_staged_rows_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_staged_rows" ADD CONSTRAINT "data_staged_rows_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_staged_rows" ADD CONSTRAINT "data_staged_rows_run_id_data_import_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "data_import_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_union_memberships" ADD CONSTRAINT "data_union_memberships_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_union_memberships" ADD CONSTRAINT "data_union_memberships_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_union_memberships" ADD CONSTRAINT "data_union_memberships_person_id_data_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "data_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_union_memberships" ADD CONSTRAINT "data_union_memberships_run_id_data_import_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "data_import_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_assertions_person_field_idx" ON "data_assertions" USING btree ("person_id","field_key","effective_from");--> statement-breakpoint
CREATE INDEX "data_assertions_union_local_idx" ON "data_assertions" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "data_datasets_union_local_idx" ON "data_datasets" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "data_employment_person_date_idx" ON "data_employment_assignments" USING btree ("person_id","effective_from");--> statement-breakpoint
CREATE INDEX "data_employment_union_local_idx" ON "data_employment_assignments" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE UNIQUE INDEX "data_identifiers_union_namespace_value_idx" ON "data_identifiers" USING btree ("union_id","namespace","value");--> statement-breakpoint
CREATE INDEX "data_identifiers_union_local_idx" ON "data_identifiers" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "data_import_runs_dataset_idx" ON "data_import_runs" USING btree ("dataset_id","created_at");--> statement-breakpoint
CREATE INDEX "data_import_runs_union_local_idx" ON "data_import_runs" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "data_people_union_local_name_idx" ON "data_people" USING btree ("union_id","local_id","display_name");--> statement-breakpoint
CREATE UNIQUE INDEX "data_publications_dataset_revision_idx" ON "data_publications" USING btree ("dataset_id","revision");--> statement-breakpoint
CREATE INDEX "data_publications_union_local_idx" ON "data_publications" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "data_records_dataset_publication_idx" ON "data_records" USING btree ("dataset_id","publication_id");--> statement-breakpoint
CREATE INDEX "data_records_union_local_idx" ON "data_records" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE UNIQUE INDEX "data_staged_run_row_idx" ON "data_staged_rows" USING btree ("run_id","row_index");--> statement-breakpoint
CREATE INDEX "data_staged_union_local_idx" ON "data_staged_rows" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "data_membership_union_number_idx" ON "data_union_memberships" USING btree ("union_id","member_number");--> statement-breakpoint
CREATE INDEX "data_membership_union_local_idx" ON "data_union_memberships" USING btree ("union_id","local_id");
CREATE UNIQUE INDEX "data_import_replay_idx" ON "data_import_runs" USING btree ("dataset_id","content_hash","mapping_version");
