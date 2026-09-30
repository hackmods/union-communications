-- ADR-023: gated union/org outreach lists (distinct from member broadcast + product news).

ALTER TABLE "unions"
  ADD COLUMN IF NOT EXISTS "outreach_lists_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outreach_lists" (
  "id" text PRIMARY KEY,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  "created_by_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "outreach_lists_union_slug_uidx"
  ON "outreach_lists" ("union_id", "slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outreach_lists_union_idx"
  ON "outreach_lists" ("union_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outreach_subscribers" (
  "id" text PRIMARY KEY,
  "list_id" text NOT NULL REFERENCES "outreach_lists"("id") ON DELETE CASCADE,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "lookup_key" text NOT NULL,
  "locale" text NOT NULL CHECK (locale IN ('en', 'fr')),
  "status" text NOT NULL DEFAULT 'pending_confirmation'
    CHECK (status IN ('pending_confirmation', 'confirmed', 'suppressed')),
  "wording_version" text,
  "latest_grant_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "outreach_subscribers_list_lookup_uidx"
  ON "outreach_subscribers" ("list_id", "lookup_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outreach_subscribers_union_status_idx"
  ON "outreach_subscribers" ("union_id", "list_id", "status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outreach_consent_events" (
  "sequence" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "id" text NOT NULL UNIQUE,
  "subscriber_id" text NOT NULL REFERENCES "outreach_subscribers"("id") ON DELETE RESTRICT,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "list_id" text NOT NULL REFERENCES "outreach_lists"("id") ON DELETE CASCADE,
  "destination_email" text NOT NULL,
  "event_type" text NOT NULL CHECK (event_type IN (
    'grant', 'confirmation', 'withdrawal', 'unsubscribe', 'import_attestation',
    'provider_bounce', 'provider_complaint'
  )),
  "locale" text CHECK (locale IN ('en', 'fr')),
  "wording_version" text,
  "wording_text" text,
  "source" text NOT NULL,
  "grant_event_id" text,
  "reason" text,
  "actor_id" text,
  "request_id" text,
  "occurred_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outreach_consent_subscriber_idx"
  ON "outreach_consent_events" ("subscriber_id", "sequence");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outreach_suppressions" (
  "id" text PRIMARY KEY,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "list_id" text REFERENCES "outreach_lists"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "lookup_key" text NOT NULL,
  "reason" text NOT NULL,
  "source" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "outreach_suppressions_union_lookup_uidx"
  ON "outreach_suppressions" ("union_id", "lookup_key");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outreach_campaigns" (
  "id" text PRIMARY KEY,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "list_id" text NOT NULL REFERENCES "outreach_lists"("id") ON DELETE CASCADE,
  "created_by_id" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "subject" text NOT NULL,
  "body_text" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'released', 'paused', 'completed')),
  "approval_reference" text,
  "recipient_count" text NOT NULL DEFAULT '0',
  "accepted_count" text NOT NULL DEFAULT '0',
  "failed_count" text NOT NULL DEFAULT '0',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "released_at" timestamptz,
  "completed_at" timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outreach_campaigns_union_idx"
  ON "outreach_campaigns" ("union_id", "list_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outreach_deliveries" (
  "id" text PRIMARY KEY,
  "campaign_id" text NOT NULL REFERENCES "outreach_campaigns"("id") ON DELETE CASCADE,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "subscriber_id" text NOT NULL REFERENCES "outreach_subscribers"("id") ON DELETE RESTRICT,
  "destination_email" text NOT NULL,
  "provider_message_id" text,
  "status" text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sending', 'accepted', 'failed', 'suppressed')),
  "error_code" text,
  "queued_at" timestamptz NOT NULL DEFAULT now(),
  "finished_at" timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outreach_deliveries_queue_idx"
  ON "outreach_deliveries" ("status", "queued_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outreach_deliveries_provider_idx"
  ON "outreach_deliveries" ("provider_message_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "outreach_action_tokens" (
  "id" text PRIMARY KEY,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "list_id" text NOT NULL REFERENCES "outreach_lists"("id") ON DELETE CASCADE,
  "subscriber_id" text NOT NULL REFERENCES "outreach_subscribers"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "purpose" text NOT NULL CHECK (purpose IN ('confirm', 'unsubscribe')),
  "grant_event_id" text,
  "expires_at" timestamptz NOT NULL,
  "consumed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outreach_action_tokens_expiry_idx"
  ON "outreach_action_tokens" ("expires_at");
--> statement-breakpoint
ALTER TABLE "outreach_lists" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outreach_subscribers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outreach_consent_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outreach_suppressions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outreach_campaigns" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outreach_deliveries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outreach_action_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_lists_tenant" ON "outreach_lists";
--> statement-breakpoint
CREATE POLICY "outreach_lists_tenant" ON "outreach_lists"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_subscribers_tenant" ON "outreach_subscribers";
--> statement-breakpoint
CREATE POLICY "outreach_subscribers_tenant" ON "outreach_subscribers"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
      OR current_setting('app.current_marketing_job', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
      OR current_setting('app.current_marketing_job', true) = 'true'
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_consent_events_tenant" ON "outreach_consent_events";
--> statement-breakpoint
CREATE POLICY "outreach_consent_events_tenant" ON "outreach_consent_events"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
      OR current_setting('app.current_marketing_job', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
      OR current_setting('app.current_marketing_job', true) = 'true'
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_suppressions_tenant" ON "outreach_suppressions";
--> statement-breakpoint
CREATE POLICY "outreach_suppressions_tenant" ON "outreach_suppressions"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
      OR current_setting('app.current_marketing_job', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
      OR current_setting('app.current_marketing_job', true) = 'true'
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_campaigns_tenant" ON "outreach_campaigns";
--> statement-breakpoint
CREATE POLICY "outreach_campaigns_tenant" ON "outreach_campaigns"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_deliveries_tenant" ON "outreach_deliveries";
--> statement-breakpoint
CREATE POLICY "outreach_deliveries_tenant" ON "outreach_deliveries"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
      OR current_setting('app.current_marketing_job', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
      OR current_setting('app.current_marketing_job', true) = 'true'
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_action_tokens_tenant" ON "outreach_action_tokens";
--> statement-breakpoint
CREATE POLICY "outreach_action_tokens_tenant" ON "outreach_action_tokens"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
      OR current_setting('app.current_marketing_job', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    AND (
      current_setting('app.current_cross_local', true) = 'true'
      OR current_setting('app.current_platform_admin', true) = 'true'
      OR current_setting('app.current_marketing_job', true) = 'true'
    )
  );
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.outreach_record_provider_event(
  p_provider_event_id text,
  p_message_id text,
  p_event_type text,
  p_suppression_id text
) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
  target record;
BEGIN
  IF current_setting('app.current_marketing_job', true) <> 'true'
    OR p_event_type NOT IN ('temporary_failure','permanent_failure','complained','unsubscribed')
    OR length(btrim(p_provider_event_id)) < 8
    OR length(btrim(p_message_id)) < 8 THEN
    RETURN false;
  END IF;
  SELECT d.id AS delivery_id,
         d.union_id,
         d.subscriber_id,
         d.destination_email,
         s.lookup_key,
         s.list_id
    INTO target
    FROM public.outreach_deliveries d
    INNER JOIN public.outreach_subscribers s ON s.id = d.subscriber_id
    WHERE btrim(d.provider_message_id,'<>') = btrim(p_message_id,'<>')
    ORDER BY d.queued_at DESC
    LIMIT 1
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF p_event_type = 'temporary_failure' THEN
    UPDATE public.outreach_deliveries
      SET error_code = 'provider_temporary_failure'
      WHERE id = target.delivery_id;
    RETURN true;
  END IF;
  UPDATE public.outreach_deliveries
    SET status = CASE WHEN p_event_type = 'permanent_failure' THEN 'failed' ELSE 'suppressed' END,
        error_code = CASE p_event_type
          WHEN 'permanent_failure' THEN 'provider_permanent_failure'
          WHEN 'complained' THEN 'provider_complaint'
          ELSE 'provider_unsubscribe' END,
        finished_at = now()
    WHERE id = target.delivery_id;
  INSERT INTO public.outreach_suppressions (
    id, union_id, list_id, email, lookup_key, reason, source
  ) VALUES (
    p_suppression_id,
    target.union_id,
    target.list_id,
    lower(target.destination_email),
    target.lookup_key,
    CASE p_event_type
      WHEN 'permanent_failure' THEN 'provider_bounce'
      WHEN 'complained' THEN 'provider_complaint'
      ELSE 'provider_unsubscribe' END,
    'mailgun_webhook'
  )
  ON CONFLICT (union_id, lookup_key) DO UPDATE SET
    email = EXCLUDED.email,
    reason = EXCLUDED.reason,
    source = EXCLUDED.source,
    created_at = now();
  UPDATE public.outreach_subscribers
    SET status = 'suppressed', updated_at = now()
    WHERE id = target.subscriber_id AND status = 'confirmed';
  RETURN true;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.outreach_record_provider_event(text,text,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.outreach_record_provider_event(text,text,text,text) TO unionops_app;
