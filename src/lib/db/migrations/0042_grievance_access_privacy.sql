ALTER TABLE "grievances" ADD COLUMN IF NOT EXISTS "member_user_id" text REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "grievances" ADD COLUMN IF NOT EXISTS "privacy_mode" text DEFAULT 'standard' NOT NULL;
--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_privacy_mode_check" CHECK ("privacy_mode" IN ('standard','restricted'));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grievances_member_user_idx" ON "grievances" ("member_user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grievance_participants" (
  "id" text PRIMARY KEY NOT NULL,
  "grievance_id" text NOT NULL REFERENCES "grievances"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL,
  "relationship" text NOT NULL,
  "access_level" text NOT NULL,
  "added_by_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  CONSTRAINT "grievance_participants_relationship_check" CHECK ("relationship" IN ('member','case_worker','representative','observer')),
  CONSTRAINT "grievance_participants_access_check" CHECK ("access_level" IN ('member_safe','summary','case_read','case_write')),
  CONSTRAINT "grievance_participants_relationship_access_check" CHECK (("relationship" = 'member' AND "access_level" = 'member_safe') OR ("relationship" <> 'member' AND "access_level" IN ('summary','case_read','case_write'))),
  CONSTRAINT "grievance_participants_case_worker_write_check" CHECK ("relationship" <> 'case_worker' OR "access_level" = 'case_write')
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "grievance_participants_active_uidx" ON "grievance_participants" ("grievance_id","user_id") WHERE "revoked_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grievance_participants_user_idx" ON "grievance_participants" ("user_id","revoked_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grievance_member_updates" (
  "id" text PRIMARY KEY NOT NULL,
  "grievance_id" text NOT NULL REFERENCES "grievances"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "published_by_id" text NOT NULL,
  "published_at" timestamp with time zone DEFAULT now() NOT NULL,
  "withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grievance_member_updates_case_idx" ON "grievance_member_updates" ("grievance_id","published_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grievance_attachment_shares" (
  "id" text PRIMARY KEY NOT NULL,
  "grievance_id" text NOT NULL REFERENCES "grievances"("id") ON DELETE CASCADE,
  "attachment_id" text NOT NULL,
  "shared_by_id" text NOT NULL,
  "shared_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "grievance_attachment_shares_active_uidx" ON "grievance_attachment_shares" ("grievance_id","attachment_id") WHERE "revoked_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grievance_attachment_shares_case_idx" ON "grievance_attachment_shares" ("grievance_id","revoked_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "break_glass_grants" (
  "id" text PRIMARY KEY NOT NULL,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "local_id" text NOT NULL REFERENCES "locals"("id") ON DELETE CASCADE,
  "grievance_id" text NOT NULL REFERENCES "grievances"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "reason" text NOT NULL,
  "granted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  CONSTRAINT "break_glass_grants_max_30_minutes" CHECK ("expires_at" <= "granted_at" + interval '30 minutes')
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "break_glass_grants_resource_idx" ON "break_glass_grants" ("grievance_id","user_id","expires_at");
--> statement-breakpoint
INSERT INTO "grievance_participants" (id, grievance_id, user_id, relationship, access_level, added_by_id)
SELECT 'gp-backfill-' || g.id || '-' || g.assigned_steward_id, g.id, g.assigned_steward_id, 'case_worker', 'case_write', g.created_by_id
FROM grievances g
WHERE g.assigned_steward_id <> ''
ON CONFLICT (grievance_id, user_id) WHERE revoked_at IS NULL DO NOTHING;
--> statement-breakpoint
UPDATE "grievances" g SET "member_user_id" = NULL WHERE "member_user_id" IS NULL;
