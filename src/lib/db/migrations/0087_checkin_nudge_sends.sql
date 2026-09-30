-- Check-in email nudges (Phase B3): dedupe one transactional send per schedule period + officer.

CREATE TABLE IF NOT EXISTS "checkin_nudge_sends" (
  "id" text PRIMARY KEY NOT NULL,
  "schedule_id" text NOT NULL REFERENCES "checkin_schedules"("id") ON DELETE CASCADE,
  "period_key" text NOT NULL,
  "user_id" text NOT NULL,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "local_id" text NOT NULL REFERENCES "locals"("id") ON DELETE CASCADE,
  "destination_email" text NOT NULL,
  "sent_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "checkin_nudge_sends_unique_period_user_idx"
  ON "checkin_nudge_sends" ("schedule_id", "period_key", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checkin_nudge_sends_schedule_period_idx"
  ON "checkin_nudge_sends" ("schedule_id", "period_key");
--> statement-breakpoint
ALTER TABLE checkin_nudge_sends ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS checkin_nudge_sends_retention_job ON checkin_nudge_sends;
--> statement-breakpoint
CREATE POLICY checkin_nudge_sends_retention_job ON checkin_nudge_sends FOR ALL
  USING (current_setting('app.current_retention_job', true) = 'true')
  WITH CHECK (current_setting('app.current_retention_job', true) = 'true');
--> statement-breakpoint
DROP POLICY IF EXISTS checkin_schedules_retention_job_read ON checkin_schedules;
--> statement-breakpoint
CREATE POLICY checkin_schedules_retention_job_read ON checkin_schedules FOR SELECT
  USING (current_setting('app.current_retention_job', true) = 'true');
--> statement-breakpoint
DROP POLICY IF EXISTS checkin_answers_retention_job_read ON checkin_answers;
--> statement-breakpoint
CREATE POLICY checkin_answers_retention_job_read ON checkin_answers FOR SELECT
  USING (current_setting('app.current_retention_job', true) = 'true');
