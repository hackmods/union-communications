-- Local Portal Floor v2: shallow reply threads, soft-delete, presence-lite heartbeats.

ALTER TABLE "portal_floor_messages" ADD COLUMN IF NOT EXISTS "parent_id" text;
--> statement-breakpoint
ALTER TABLE "portal_floor_messages" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "portal_floor_messages"
    ADD CONSTRAINT "portal_floor_messages_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "portal_floor_messages"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "portal_floor_messages_parent_idx"
  ON "portal_floor_messages" ("parent_id");
--> statement-breakpoint
ALTER TABLE "portal_circle_memberships" ADD COLUMN IF NOT EXISTS "last_floor_seen_at" timestamptz;
