-- One-time MFA recovery codes. Only hashes are stored; rows are retained as
-- used evidence until the owning account is deleted under the approved
-- account-retention process. This account-security table is user-owned, not
-- union-owned, and intentionally has no tenant RLS policy.
CREATE TABLE "mfa_recovery_codes" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "code_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "used_at" timestamp with time zone,
  CONSTRAINT "mfa_recovery_codes_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mfa_recovery_codes_user_hash_idx"
  ON "mfa_recovery_codes" USING btree ("user_id", "code_hash");
--> statement-breakpoint
CREATE INDEX "mfa_recovery_codes_user_used_idx"
  ON "mfa_recovery_codes" USING btree ("user_id", "used_at");
--> statement-breakpoint
ALTER TABLE mfa_recovery_codes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE mfa_recovery_codes FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY mfa_recovery_codes_user_scope ON mfa_recovery_codes
  FOR ALL
  USING ("user_id" = nullif(current_setting('app.current_user_id', true), ''))
  WITH CHECK ("user_id" = nullif(current_setting('app.current_user_id', true), ''));
