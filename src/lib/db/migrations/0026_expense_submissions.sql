CREATE TABLE "expense_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"submitted_by_id" text NOT NULL,
	"submitted_by_name" text NOT NULL,
	"title" text NOT NULL,
	"purpose" text NOT NULL,
	"status" text NOT NULL,
	"line_items" jsonb NOT NULL,
	"total_amount" double precision NOT NULL,
	"approved_by_id" text,
	"approved_at" timestamp with time zone,
	"denied_reason" text,
	"ledger_entry_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense_submissions" ADD CONSTRAINT "expense_submissions_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_submissions" ADD CONSTRAINT "expense_submissions_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_submissions_union_local_idx" ON "expense_submissions" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "expense_submissions_status_idx" ON "expense_submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "expense_submissions_submitted_by_idx" ON "expense_submissions" USING btree ("submitted_by_id");--> statement-breakpoint
ALTER TABLE "attachment_meta" ADD COLUMN IF NOT EXISTS "expense_submission_id" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachment_meta_expense_submission_idx" ON "attachment_meta" USING btree ("expense_submission_id");--> statement-breakpoint
ALTER TABLE expense_submissions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS expense_submissions_tenant_isolation ON expense_submissions;
CREATE POLICY expense_submissions_tenant_isolation ON expense_submissions
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR local_id = current_setting('app.current_local_id', true)
    )
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR local_id = current_setting('app.current_local_id', true)
    )
  );
