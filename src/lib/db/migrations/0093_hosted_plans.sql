-- Hosted Free/Member/Paid plan fields (ADR-024). Defaults unset = inherit / fail-open until CapRover flag.
-- Member and Paid share Full access; commercial columns are billing-only.

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "hosted_access_class" text NOT NULL DEFAULT 'unset';

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "hosted_commercial_class" text NOT NULL DEFAULT 'unset';

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "hosted_seat_sku" text;

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "hosted_seat_cap" integer;

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "hosted_module_subset" jsonb;

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "hosted_portal_surface_subset" jsonb;

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "hosted_donation_acknowledged" boolean NOT NULL DEFAULT false;

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "hosted_plan_notes" text NOT NULL DEFAULT '';

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "hosted_plan_updated_at" timestamp with time zone;

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "hosted_plan_updated_by" text;

ALTER TABLE "locals"
  ADD COLUMN IF NOT EXISTS "hosted_access_class" text NOT NULL DEFAULT 'unset';

ALTER TABLE "locals"
  ADD COLUMN IF NOT EXISTS "hosted_commercial_class" text NOT NULL DEFAULT 'unset';

ALTER TABLE "locals"
  ADD COLUMN IF NOT EXISTS "hosted_seat_sku" text;

ALTER TABLE "locals"
  ADD COLUMN IF NOT EXISTS "hosted_seat_cap" integer;

ALTER TABLE "locals"
  ADD COLUMN IF NOT EXISTS "hosted_module_subset" jsonb;

ALTER TABLE "locals"
  ADD COLUMN IF NOT EXISTS "hosted_portal_surface_subset" jsonb;

ALTER TABLE "locals"
  ADD COLUMN IF NOT EXISTS "hosted_donation_acknowledged" boolean NOT NULL DEFAULT false;

ALTER TABLE "locals"
  ADD COLUMN IF NOT EXISTS "hosted_plan_notes" text NOT NULL DEFAULT '';

ALTER TABLE "locals"
  ADD COLUMN IF NOT EXISTS "hosted_plan_updated_at" timestamp with time zone;

ALTER TABLE "locals"
  ADD COLUMN IF NOT EXISTS "hosted_plan_updated_by" text;
