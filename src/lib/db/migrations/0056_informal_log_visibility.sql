-- Steward Quick-Log per-entry visibility (private / local_executive / area_officer).
ALTER TABLE "informal_log_entries"
  ADD COLUMN IF NOT EXISTS "visibility" text NOT NULL DEFAULT 'local_executive';
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'informal_log_entries_visibility_check'
  ) THEN
    ALTER TABLE "informal_log_entries"
      ADD CONSTRAINT "informal_log_entries_visibility_check"
      CHECK ("visibility" IN ('private', 'local_executive', 'area_officer'));
  END IF;
END $$;
