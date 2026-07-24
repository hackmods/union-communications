CREATE TABLE "committees" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"member_officer_ids" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "committees" ADD CONSTRAINT "committees_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committees" ADD CONSTRAINT "committees_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "committees_union_local_idx" ON "committees" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "committees_name_idx" ON "committees" USING btree ("name");--> statement-breakpoint
-- ORG-004 / ADR-008: Row-Level Security for internal committees.
ALTER TABLE committees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS committees_tenant_isolation ON committees;
CREATE POLICY committees_tenant_isolation ON committees
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
