-- Durable magic sign-in tokens (AUTH_USERS_BACKEND=postgres).
-- No RLS — public token lookup must work without tenant GUCs (same as users).
CREATE TABLE IF NOT EXISTS "sign_in_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"email" text NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sign_in_tokens_token_idx" ON "sign_in_tokens" USING btree ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sign_in_tokens_email_idx" ON "sign_in_tokens" USING btree ("email");
