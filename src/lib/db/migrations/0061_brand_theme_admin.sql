-- Per-union operator theme (colours + canvas fonts) and instance host-brand row.
ALTER TABLE "unions" ADD COLUMN IF NOT EXISTS "brand_theme" jsonb;

CREATE TABLE IF NOT EXISTS "platform_host_brand" (
  "id" text PRIMARY KEY NOT NULL,
  "payload" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
