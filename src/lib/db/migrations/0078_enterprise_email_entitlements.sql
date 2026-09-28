-- Enterprise email entitlements (ADR-022). All default closed.
-- CapRover host flags must also be true before any capability may send.

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "member_broadcast_enabled" boolean DEFAULT false NOT NULL;

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "comms_auto_send_enabled" boolean DEFAULT false NOT NULL;

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "grievance_smtp_enabled" boolean DEFAULT false NOT NULL;

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "email_tracking_pixels_enabled" boolean DEFAULT false NOT NULL;
