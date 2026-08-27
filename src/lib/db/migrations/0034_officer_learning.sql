CREATE TABLE "officer_learning_users" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"display_name" text NOT NULL,
	"hub_sync_enabled" boolean DEFAULT false NOT NULL,
	"share_with_local" boolean DEFAULT false NOT NULL,
	"modules" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "officer_learning_local_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"reporting_enabled" boolean DEFAULT false NOT NULL,
	"updated_by_id" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "officer_learning_users" ADD CONSTRAINT "officer_learning_users_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_learning_users" ADD CONSTRAINT "officer_learning_users_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_learning_local_settings" ADD CONSTRAINT "officer_learning_local_settings_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_learning_local_settings" ADD CONSTRAINT "officer_learning_local_settings_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "officer_learning_users_union_user_idx" ON "officer_learning_users" USING btree ("union_id","user_id");--> statement-breakpoint
CREATE INDEX "officer_learning_users_union_local_idx" ON "officer_learning_users" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE UNIQUE INDEX "officer_learning_local_settings_union_local_idx" ON "officer_learning_local_settings" USING btree ("union_id","local_id");--> statement-breakpoint
ALTER TABLE officer_learning_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_learning_local_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS officer_learning_users_tenant_isolation ON officer_learning_users;
CREATE POLICY officer_learning_users_tenant_isolation ON officer_learning_users
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS officer_learning_local_settings_tenant_isolation ON officer_learning_local_settings;
CREATE POLICY officer_learning_local_settings_tenant_isolation ON officer_learning_local_settings
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
