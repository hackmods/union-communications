-- A union administrator may see local directory metadata only after an
-- operator explicitly enables the paid entitlement for that union.
ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "paid_tenant_directory_enabled" boolean NOT NULL DEFAULT false;
