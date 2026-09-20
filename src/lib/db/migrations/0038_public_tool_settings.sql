-- Public Comms tool visibility (instance + union + local overlays).
-- Platform table has no tenant RLS (operator-only writes). Union/local tables are RLS-scoped.

CREATE TABLE IF NOT EXISTS "platform_public_tool_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"disabled_tool_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_by_id" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "union_public_tool_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"disabled_tool_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_by_id" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "local_public_tool_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"disabled_tool_slugs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_by_id" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "union_public_tool_settings" ADD CONSTRAINT "union_public_tool_settings_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_public_tool_settings" ADD CONSTRAINT "local_public_tool_settings_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_public_tool_settings" ADD CONSTRAINT "local_public_tool_settings_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "union_public_tool_settings_union_idx" ON "union_public_tool_settings" USING btree ("union_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "union_public_tool_settings_union_id_idx" ON "union_public_tool_settings" USING btree ("union_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "local_public_tool_settings_union_local_idx" ON "local_public_tool_settings" USING btree ("union_id","local_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "local_public_tool_settings_union_id_idx" ON "local_public_tool_settings" USING btree ("union_id");
--> statement-breakpoint
INSERT INTO "platform_public_tool_settings" ("id", "disabled_tool_slugs", "updated_by_id")
VALUES ('default', '[]'::jsonb, '')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
ALTER TABLE union_public_tool_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_public_tool_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY union_public_tool_settings_tenant_isolation ON union_public_tool_settings
  FOR ALL
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
  )
  WITH CHECK (
    union_id = nullif(current_setting('app.current_union_id', true), '')
  );
--> statement-breakpoint
CREATE POLICY local_public_tool_settings_tenant_isolation ON local_public_tool_settings
  FOR ALL
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  )
  WITH CHECK (
    union_id = nullif(current_setting('app.current_union_id', true), '')
  );
