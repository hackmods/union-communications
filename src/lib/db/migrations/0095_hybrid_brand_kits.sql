-- Hybrid Brand Kit: Local shared defaults + personal overlays + durable preset catalog.
CREATE TABLE IF NOT EXISTS "local_brand_kits" (
  "union_id" text NOT NULL,
  "local_id" text NOT NULL,
  "brand_kit" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text NOT NULL,
  PRIMARY KEY ("union_id", "local_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_brand_overlays" (
  "union_id" text NOT NULL,
  "user_id" text NOT NULL,
  "overlay" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "onboarding_complete" boolean NOT NULL DEFAULT false,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("union_id", "user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comms_preset_catalog" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "name_fr" text,
  "payload" jsonb NOT NULL,
  "archived_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "local_brand_kits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_brand_overlays" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "local_brand_kits_tenant" ON "local_brand_kits"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    OR current_setting('app.current_platform_admin', true) = 'true'
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    OR current_setting('app.current_platform_admin', true) = 'true'
  );
--> statement-breakpoint
CREATE POLICY "user_brand_overlays_tenant" ON "user_brand_overlays"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    OR current_setting('app.current_platform_admin', true) = 'true'
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    OR current_setting('app.current_platform_admin', true) = 'true'
  );
