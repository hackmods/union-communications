-- Member broadcast consent + campaign audit (ADR-022). Default: no rows = no recipients.

CREATE TABLE IF NOT EXISTS "member_broadcast_consents" (
  "id" text PRIMARY KEY,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "local_id" text NOT NULL REFERENCES "locals"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "status" text NOT NULL DEFAULT 'confirmed',
  "wording_version" text NOT NULL,
  "consented_at" timestamptz NOT NULL DEFAULT now(),
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "member_broadcast_consents_user_local_uidx"
  ON "member_broadcast_consents" ("user_id", "local_id");
CREATE INDEX IF NOT EXISTS "member_broadcast_consents_local_status_idx"
  ON "member_broadcast_consents" ("union_id", "local_id", "status");

CREATE TABLE IF NOT EXISTS "member_broadcast_campaigns" (
  "id" text PRIMARY KEY,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "local_id" text NOT NULL REFERENCES "locals"("id") ON DELETE CASCADE,
  "created_by_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "subject" text NOT NULL,
  "body_text" text NOT NULL,
  "open_tracking_requested" text NOT NULL DEFAULT 'no',
  "open_tracking_applied" text NOT NULL DEFAULT 'no',
  "recipient_count" text NOT NULL DEFAULT '0',
  "accepted_count" text NOT NULL DEFAULT '0',
  "failed_count" text NOT NULL DEFAULT '0',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "member_broadcast_campaigns_local_idx"
  ON "member_broadcast_campaigns" ("union_id", "local_id");

ALTER TABLE "member_broadcast_consents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member_broadcast_campaigns" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_broadcast_consents_tenant" ON "member_broadcast_consents";
CREATE POLICY "member_broadcast_consents_tenant" ON "member_broadcast_consents"
  FOR ALL
  USING (
    union_id = current_setting('app.union_id', true)
    AND (
      local_id = current_setting('app.local_id', true)
      OR current_setting('app.cross_local', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.union_id', true)
    AND (
      local_id = current_setting('app.local_id', true)
      OR current_setting('app.cross_local', true) = 'true'
    )
  );

DROP POLICY IF EXISTS "member_broadcast_campaigns_tenant" ON "member_broadcast_campaigns";
CREATE POLICY "member_broadcast_campaigns_tenant" ON "member_broadcast_campaigns"
  FOR ALL
  USING (
    union_id = current_setting('app.union_id', true)
    AND (
      local_id = current_setting('app.local_id', true)
      OR current_setting('app.cross_local', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.union_id', true)
    AND (
      local_id = current_setting('app.local_id', true)
      OR current_setting('app.cross_local', true) = 'true'
    )
  );
