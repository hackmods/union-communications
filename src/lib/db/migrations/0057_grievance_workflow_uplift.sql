-- Phase B grievance uplift: intake/formal workflow, file numbers, 5W+H, outcomes.
ALTER TABLE "grievances"
  ADD COLUMN IF NOT EXISTS "workflow_stage" text NOT NULL DEFAULT 'formal',
  ADD COLUMN IF NOT EXISTS "file_number" text,
  ADD COLUMN IF NOT EXISTS "grievance_type" text,
  ADD COLUMN IF NOT EXISTS "member_names" jsonb,
  ADD COLUMN IF NOT EXISTS "summary" text,
  ADD COLUMN IF NOT EXISTS "intake" jsonb,
  ADD COLUMN IF NOT EXISTS "linked_snippets" jsonb,
  ADD COLUMN IF NOT EXISTS "local_label" text,
  ADD COLUMN IF NOT EXISTS "unit_label" text;
--> statement-breakpoint
UPDATE "grievances" SET "workflow_stage" = 'formal' WHERE "workflow_stage" IS DISTINCT FROM 'intake' AND "workflow_stage" IS DISTINCT FROM 'formal';
--> statement-breakpoint
UPDATE "grievances" SET "workflow_stage" = 'formal' WHERE "workflow_stage" IS NULL;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grievances_workflow_stage_check'
  ) THEN
    ALTER TABLE "grievances"
      ADD CONSTRAINT "grievances_workflow_stage_check"
      CHECK ("workflow_stage" IN ('intake', 'formal'));
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grievances_grievance_type_check'
  ) THEN
    ALTER TABLE "grievances"
      ADD CONSTRAINT "grievances_grievance_type_check"
      CHECK (
        "grievance_type" IS NULL
        OR "grievance_type" IN ('individual', 'group', 'policy')
      );
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "grievances_union_local_file_number_uidx"
  ON "grievances" ("union_id", "local_id", "file_number")
  WHERE "file_number" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "grievance_outcomes"
  ADD COLUMN IF NOT EXISTS "mediator_name" text,
  ADD COLUMN IF NOT EXISTS "sent_to_arbitration" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sent_to_arbitration_at" timestamp with time zone;
