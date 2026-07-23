-- FEAT-001: durable attachment metadata + local documents vault.
-- Bytes live in object storage (ATTACHMENT_STORAGE=local by default); this table is metadata only.

CREATE TABLE "attachment_meta" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"bargaining_unit_id" text,
	"grievance_id" text,
	"bumping_case_id" text,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"scan_status" text NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"bargaining_unit_id" text,
	"title" text NOT NULL,
	"category" text,
	"description" text,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"scan_status" text NOT NULL,
	"uploaded_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachment_meta" ADD CONSTRAINT "attachment_meta_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment_meta" ADD CONSTRAINT "attachment_meta_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachment_meta" ADD CONSTRAINT "attachment_meta_bargaining_unit_id_bargaining_units_id_fk" FOREIGN KEY ("bargaining_unit_id") REFERENCES "public"."bargaining_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_bargaining_unit_id_bargaining_units_id_fk" FOREIGN KEY ("bargaining_unit_id") REFERENCES "public"."bargaining_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachment_meta_union_local_idx" ON "attachment_meta" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "attachment_meta_grievance_idx" ON "attachment_meta" USING btree ("grievance_id");--> statement-breakpoint
CREATE INDEX "attachment_meta_bumping_idx" ON "attachment_meta" USING btree ("bumping_case_id");--> statement-breakpoint
CREATE INDEX "documents_union_local_idx" ON "documents" USING btree ("union_id","local_id");--> statement-breakpoint
-- Tenant RLS (same session vars as 0002 / 0005).
ALTER TABLE attachment_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attachment_meta_tenant_isolation ON attachment_meta;
CREATE POLICY attachment_meta_tenant_isolation ON attachment_meta
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS documents_tenant_isolation ON documents;
CREATE POLICY documents_tenant_isolation ON documents
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
