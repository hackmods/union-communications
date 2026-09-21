CREATE TABLE "access_requests" (
  "id" text PRIMARY KEY NOT NULL, "submission_key" text NOT NULL, "kind" text NOT NULL, "name" text NOT NULL, "email" text NOT NULL, "union_name" text NOT NULL, "local_name" text NOT NULL, "role" text, "offerings" jsonb NOT NULL, "message" text, "locale" text NOT NULL, "consent_accepted_at" timestamp with time zone NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL, "status" text DEFAULT 'new' NOT NULL, "union_id" text, "local_id" text, "private_note" text, "reviewed_by_id" text, "invite_id" text, "receipt_sent_at" timestamp with time zone, "notify_sent_at" timestamp with time zone, "notification_error" text, "review_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
  CONSTRAINT "access_requests_kind_check" CHECK ("kind" IN ('local_interest','member_access')), CONSTRAINT "access_requests_status_check" CHECK ("status" IN ('new','reviewing','approved','invited','completed','declined')), CONSTRAINT "access_requests_route_check" CHECK (("union_id" IS NULL) = ("local_id" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "access_requests_submission_key_idx" ON "access_requests" USING btree ("submission_key");
--> statement-breakpoint
CREATE INDEX "access_requests_status_created_idx" ON "access_requests" USING btree ("status", "created_at");
--> statement-breakpoint
CREATE INDEX "access_requests_local_scope_idx" ON "access_requests" USING btree ("union_id", "local_id", "kind", "status");
--> statement-breakpoint
CREATE INDEX "access_requests_invite_idx" ON "access_requests" USING btree ("invite_id");
--> statement-breakpoint
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY access_requests_public_submit ON access_requests FOR INSERT WITH CHECK ("status" = 'new' AND "union_id" IS NULL AND "local_id" IS NULL AND "private_note" IS NULL AND "reviewed_by_id" IS NULL AND "invite_id" IS NULL);
--> statement-breakpoint
CREATE POLICY access_requests_operator_all ON access_requests FOR ALL USING (current_setting('app.current_mfa_verified', true) = 'true' AND EXISTS (SELECT 1 FROM users u WHERE u.id = nullif(current_setting('app.current_user_id', true), '') AND u.roles ? 'platform_admin' AND u.archived_at IS NULL AND u.locked_at IS NULL)) WITH CHECK (current_setting('app.current_mfa_verified', true) = 'true' AND EXISTS (SELECT 1 FROM users u WHERE u.id = nullif(current_setting('app.current_user_id', true), '') AND u.roles ? 'platform_admin' AND u.archived_at IS NULL AND u.locked_at IS NULL));
--> statement-breakpoint
CREATE POLICY access_requests_local_select ON access_requests FOR SELECT USING ("kind" = 'member_access' AND "union_id" = nullif(current_setting('app.current_union_id', true), '') AND "local_id" = nullif(current_setting('app.current_local_id', true), '') AND app_org_manage("union_id", "local_id", 'memberships.manage'));
--> statement-breakpoint
CREATE POLICY access_requests_local_update ON access_requests FOR UPDATE USING ("kind" = 'member_access' AND "union_id" = nullif(current_setting('app.current_union_id', true), '') AND "local_id" = nullif(current_setting('app.current_local_id', true), '') AND app_org_manage("union_id", "local_id", 'memberships.manage')) WITH CHECK ("kind" = 'member_access' AND "union_id" = nullif(current_setting('app.current_union_id', true), '') AND "local_id" = nullif(current_setting('app.current_local_id', true), '') AND app_org_manage("union_id", "local_id", 'memberships.manage'));
--> statement-breakpoint

