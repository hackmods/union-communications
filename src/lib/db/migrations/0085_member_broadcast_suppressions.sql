-- Member broadcast suppressions, unsubscribe tokens, delivery correlation (ADR-022 B1).

CREATE TABLE IF NOT EXISTS "member_broadcast_suppressions" (
  "id" text PRIMARY KEY,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "local_id" text NOT NULL REFERENCES "locals"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "reason" text NOT NULL,
  "source" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "member_broadcast_suppressions_user_local_uidx"
  ON "member_broadcast_suppressions" ("union_id", "local_id", "user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member_broadcast_action_tokens" (
  "id" text PRIMARY KEY,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "local_id" text NOT NULL REFERENCES "locals"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "campaign_id" text REFERENCES "member_broadcast_campaigns"("id") ON DELETE SET NULL,
  "token_hash" text NOT NULL UNIQUE,
  "purpose" text NOT NULL CHECK (purpose IN ('unsubscribe')),
  "expires_at" timestamptz NOT NULL,
  "consumed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_broadcast_action_tokens_expiry_idx"
  ON "member_broadcast_action_tokens" ("expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member_broadcast_deliveries" (
  "id" text PRIMARY KEY,
  "campaign_id" text NOT NULL REFERENCES "member_broadcast_campaigns"("id") ON DELETE CASCADE,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "local_id" text NOT NULL REFERENCES "locals"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "destination_email" text NOT NULL,
  "provider_message_id" text,
  "status" text NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'failed', 'suppressed')),
  "error_code" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "finished_at" timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_broadcast_deliveries_provider_idx"
  ON "member_broadcast_deliveries" ("provider_message_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "member_broadcast_provider_events" (
  "id" text PRIMARY KEY,
  "delivery_id" text NOT NULL REFERENCES "member_broadcast_deliveries"("id") ON DELETE RESTRICT,
  "event_type" text NOT NULL CHECK (event_type IN ('temporary_failure','permanent_failure','complained','unsubscribed')),
  "occurred_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "member_broadcast_suppressions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "member_broadcast_action_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "member_broadcast_deliveries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "member_broadcast_provider_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "member_broadcast_suppressions_tenant" ON "member_broadcast_suppressions";
--> statement-breakpoint
CREATE POLICY "member_broadcast_suppressions_tenant" ON "member_broadcast_suppressions"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      local_id = current_setting('app.current_local_id', true)
      OR current_setting('app.current_cross_local', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    AND (
      local_id = current_setting('app.current_local_id', true)
      OR current_setting('app.current_cross_local', true) = 'true'
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "member_broadcast_action_tokens_tenant" ON "member_broadcast_action_tokens";
--> statement-breakpoint
CREATE POLICY "member_broadcast_action_tokens_tenant" ON "member_broadcast_action_tokens"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      local_id = current_setting('app.current_local_id', true)
      OR current_setting('app.current_cross_local', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    AND (
      local_id = current_setting('app.current_local_id', true)
      OR current_setting('app.current_cross_local', true) = 'true'
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "member_broadcast_deliveries_tenant" ON "member_broadcast_deliveries";
--> statement-breakpoint
CREATE POLICY "member_broadcast_deliveries_tenant" ON "member_broadcast_deliveries"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      local_id = current_setting('app.current_local_id', true)
      OR current_setting('app.current_cross_local', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    AND (
      local_id = current_setting('app.current_local_id', true)
      OR current_setting('app.current_cross_local', true) = 'true'
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "member_broadcast_provider_events_tenant" ON "member_broadcast_provider_events";
--> statement-breakpoint
CREATE POLICY "member_broadcast_provider_events_tenant" ON "member_broadcast_provider_events"
  FOR ALL
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.member_broadcast_revoke_from_token(
  p_token_hash text,
  p_event_id text,
  p_source text DEFAULT 'email_link'
) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
  action_token public.member_broadcast_action_tokens%ROWTYPE;
  person_email text;
BEGIN
  IF length(p_token_hash) <> 64 OR length(btrim(p_event_id)) < 8 THEN
    RETURN false;
  END IF;
  SELECT * INTO action_token FROM public.member_broadcast_action_tokens
    WHERE token_hash = p_token_hash
      AND purpose = 'unsubscribe'
      AND expires_at > now()
      AND consumed_at IS NULL
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  SELECT email INTO person_email FROM public.users WHERE id = action_token.user_id;
  IF person_email IS NULL THEN
    RETURN false;
  END IF;
  INSERT INTO public.member_broadcast_suppressions (
    id, union_id, local_id, user_id, email, reason, source
  ) VALUES (
    p_event_id,
    action_token.union_id,
    action_token.local_id,
    action_token.user_id,
    lower(person_email),
    'member_withdrawal',
    p_source
  )
  ON CONFLICT (union_id, local_id, user_id) DO UPDATE SET
    email = EXCLUDED.email,
    reason = EXCLUDED.reason,
    source = EXCLUDED.source,
    created_at = now();
  UPDATE public.member_broadcast_consents
    SET status = 'revoked',
        revoked_at = now(),
        email = lower(person_email)
    WHERE user_id = action_token.user_id
      AND local_id = action_token.local_id;
  IF NOT FOUND THEN
    INSERT INTO public.member_broadcast_consents (
      id, union_id, local_id, user_id, email, status, wording_version, revoked_at
    ) VALUES (
      p_event_id,
      action_token.union_id,
      action_token.local_id,
      action_token.user_id,
      lower(person_email),
      'revoked',
      'member-broadcast-revoked-without-prior-consent',
      now()
    );
  END IF;
  UPDATE public.member_broadcast_action_tokens
    SET consumed_at = now()
    WHERE id = action_token.id;
  RETURN true;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.member_broadcast_revoke_from_token(text,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.member_broadcast_revoke_from_token(text,text,text) TO unionops_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.member_broadcast_record_provider_event(
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
         d.local_id,
         d.user_id,
         d.destination_email,
         d.status AS delivery_status
    INTO target
    FROM public.member_broadcast_deliveries d
    WHERE btrim(d.provider_message_id,'<>') = btrim(p_message_id,'<>')
    ORDER BY d.created_at DESC
    LIMIT 1
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  INSERT INTO public.member_broadcast_provider_events (id, delivery_id, event_type)
    VALUES (p_provider_event_id, target.delivery_id, p_event_type)
    ON CONFLICT (id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN true;
  END IF;
  IF p_event_type = 'temporary_failure' THEN
    UPDATE public.member_broadcast_deliveries
      SET error_code = 'provider_temporary_failure'
      WHERE id = target.delivery_id;
    RETURN true;
  END IF;
  UPDATE public.member_broadcast_deliveries
    SET status = CASE WHEN p_event_type = 'permanent_failure' THEN 'failed' ELSE 'suppressed' END,
        error_code = CASE p_event_type
          WHEN 'permanent_failure' THEN 'provider_permanent_failure'
          WHEN 'complained' THEN 'provider_complaint'
          ELSE 'provider_unsubscribe' END,
        finished_at = now()
    WHERE id = target.delivery_id;
  INSERT INTO public.member_broadcast_suppressions (
    id, union_id, local_id, user_id, email, reason, source
  ) VALUES (
    p_suppression_id,
    target.union_id,
    target.local_id,
    target.user_id,
    lower(target.destination_email),
    CASE p_event_type
      WHEN 'permanent_failure' THEN 'provider_bounce'
      WHEN 'complained' THEN 'provider_complaint'
      ELSE 'provider_unsubscribe' END,
    'mailgun_webhook'
  )
  ON CONFLICT (union_id, local_id, user_id) DO UPDATE SET
    email = EXCLUDED.email,
    reason = EXCLUDED.reason,
    source = EXCLUDED.source,
    created_at = now();
  UPDATE public.member_broadcast_consents
    SET status = 'revoked', revoked_at = now()
    WHERE user_id = target.user_id AND local_id = target.local_id AND status = 'confirmed';
  RETURN true;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.member_broadcast_record_provider_event(text,text,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.member_broadcast_record_provider_event(text,text,text,text) TO unionops_app;
