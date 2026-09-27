-- ADR-021: platform-wide individual product-news consent. Public callers can
-- only use narrowly scoped SECURITY DEFINER functions; no list-read privilege.
CREATE TABLE marketing_subscribers (
  id text PRIMARY KEY,
  email text NOT NULL,
  lookup_key text NOT NULL UNIQUE,
  locale text NOT NULL CHECK (locale IN ('en', 'fr')),
  status text NOT NULL CHECK (status IN ('pending_confirmation', 'confirmed', 'suppressed')),
  latest_grant_id text,
  wording_version text,
  last_request_at timestamptz,
  last_preferences_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_subscriber_grant CHECK (
    (latest_grant_id IS NULL AND wording_version IS NULL)
    OR (latest_grant_id IS NOT NULL AND wording_version IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE INDEX marketing_subscribers_status_idx ON marketing_subscribers (status, locale);
--> statement-breakpoint
CREATE TABLE marketing_consent_events (
  sequence bigserial PRIMARY KEY,
  id text NOT NULL UNIQUE,
  subscriber_id text NOT NULL REFERENCES marketing_subscribers(id) ON DELETE RESTRICT,
  destination_email text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('grant', 'confirmation', 'withdrawal', 'unsubscribe', 'admin_correction', 'provider_bounce', 'provider_complaint')),
  locale text CHECK (locale IN ('en','fr')),
  wording_version text,
  wording_text text,
  source text NOT NULL,
  grant_event_id text,
  reason text,
  actor_id text,
  request_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_event_shape CHECK (
    (event_type = 'grant' AND locale IS NOT NULL AND wording_version IS NOT NULL AND length(btrim(wording_version)) > 0 AND length(btrim(coalesce(wording_text,''))) > 10 AND grant_event_id IS NULL)
    OR (event_type = 'confirmation' AND grant_event_id IS NOT NULL AND wording_version IS NULL)
    OR (event_type IN ('withdrawal', 'unsubscribe') AND wording_version IS NULL)
    OR (event_type = 'admin_correction' AND grant_event_id IS NOT NULL AND length(btrim(coalesce(reason, ''))) > 0 AND actor_id IS NOT NULL)
    OR (event_type IN ('provider_bounce','provider_complaint') AND wording_version IS NULL AND source='mailgun_webhook')
  )
);
--> statement-breakpoint
CREATE INDEX marketing_consent_subscriber_idx ON marketing_consent_events (subscriber_id, sequence);
--> statement-breakpoint
CREATE TABLE marketing_action_tokens (
  id text PRIMARY KEY,
  subscriber_id text NOT NULL REFERENCES marketing_subscribers(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE,
  purpose text NOT NULL CHECK (purpose IN ('confirm', 'preferences', 'unsubscribe')),
  grant_event_id text,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX marketing_action_token_expiry_idx ON marketing_action_tokens (expires_at);
--> statement-breakpoint
CREATE TABLE marketing_request_limits (
  key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0)
);
--> statement-breakpoint
CREATE INDEX marketing_request_limits_window_idx ON marketing_request_limits (window_started_at);
--> statement-breakpoint
CREATE TABLE marketing_campaigns (
  id text PRIMARY KEY,
  subject_en text NOT NULL,
  subject_fr text NOT NULL,
  body_en text NOT NULL,
  body_fr text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'released', 'paused', 'completed')),
  approval_reference text,
  approved_by text,
  approved_at timestamptz,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  released_by text,
  released_at timestamptz,
  completed_at timestamptz
);
--> statement-breakpoint
CREATE INDEX marketing_campaigns_created_idx ON marketing_campaigns (created_at);
--> statement-breakpoint
CREATE TABLE marketing_deliveries (
  id text PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES marketing_campaigns(id) ON DELETE RESTRICT,
  subscriber_id text NOT NULL REFERENCES marketing_subscribers(id) ON DELETE RESTRICT,
  kind text NOT NULL DEFAULT 'campaign' CHECK (kind IN ('campaign', 'test')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'accepted', 'failed', 'suppressed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  provider_message_id text,
  error_code text,
  queued_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  finished_at timestamptz,
  UNIQUE (campaign_id, subscriber_id, kind)
);
--> statement-breakpoint
CREATE INDEX marketing_delivery_queue_idx ON marketing_deliveries (status, queued_at);
--> statement-breakpoint
CREATE INDEX marketing_delivery_provider_idx ON marketing_deliveries (provider_message_id);
--> statement-breakpoint
CREATE TABLE marketing_provider_events (
  id text PRIMARY KEY,
  delivery_id text NOT NULL REFERENCES marketing_deliveries(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('temporary_failure','permanent_failure','complained','unsubscribed')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE marketing_dispatch_control (
  id integer PRIMARY KEY CHECK (id = 1),
  next_send_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
INSERT INTO marketing_dispatch_control (id) VALUES (1);
--> statement-breakpoint
-- Table privileges are intentionally narrower than default app-role grants.
REVOKE ALL ON marketing_subscribers, marketing_consent_events, marketing_action_tokens,
  marketing_request_limits, marketing_campaigns, marketing_deliveries, marketing_provider_events,
  marketing_dispatch_control FROM unionops_app;
--> statement-breakpoint
REVOKE ALL ON SEQUENCE marketing_consent_events_sequence_seq FROM unionops_app;
--> statement-breakpoint
GRANT SELECT, UPDATE ON marketing_subscribers TO unionops_app;
--> statement-breakpoint
GRANT SELECT, INSERT ON marketing_consent_events TO unionops_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON marketing_campaigns, marketing_deliveries TO unionops_app;
--> statement-breakpoint
GRANT SELECT ON marketing_provider_events TO unionops_app;
--> statement-breakpoint
GRANT SELECT, UPDATE ON marketing_dispatch_control TO unionops_app;
--> statement-breakpoint
ALTER TABLE marketing_subscribers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY marketing_subscribers_admin_job ON marketing_subscribers FOR ALL
  USING (public.customization_root(NULL, true) OR current_setting('app.current_marketing_job', true) = 'true')
  WITH CHECK (public.customization_root(NULL, true) OR current_setting('app.current_marketing_job', true) = 'true');
--> statement-breakpoint
ALTER TABLE marketing_consent_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY marketing_consent_admin_read ON marketing_consent_events FOR SELECT
  USING (public.customization_root(NULL, true));
--> statement-breakpoint
CREATE POLICY marketing_consent_admin_insert ON marketing_consent_events FOR INSERT
  WITH CHECK (public.customization_root(NULL, true));
--> statement-breakpoint
ALTER TABLE marketing_action_tokens ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE marketing_request_limits ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY marketing_campaign_admin_job ON marketing_campaigns FOR ALL
  USING (public.customization_root(NULL, true) OR current_setting('app.current_marketing_job', true) = 'true')
  WITH CHECK (public.customization_root(NULL, true) OR current_setting('app.current_marketing_job', true) = 'true');
--> statement-breakpoint
ALTER TABLE marketing_deliveries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY marketing_delivery_admin_job ON marketing_deliveries FOR ALL
  USING (public.customization_root(NULL, true) OR current_setting('app.current_marketing_job', true) = 'true')
  WITH CHECK (public.customization_root(NULL, true) OR current_setting('app.current_marketing_job', true) = 'true');
--> statement-breakpoint
ALTER TABLE marketing_provider_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY marketing_provider_event_admin_read ON marketing_provider_events FOR SELECT
  USING (public.customization_root(NULL, true));
--> statement-breakpoint
ALTER TABLE marketing_dispatch_control ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY marketing_dispatch_job ON marketing_dispatch_control FOR ALL
  USING (current_setting('app.current_marketing_job', true) = 'true')
  WITH CHECK (current_setting('app.current_marketing_job', true) = 'true');
--> statement-breakpoint
CREATE FUNCTION public.marketing_consent_immutable() RETURNS trigger
  LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  RAISE EXCEPTION 'marketing consent history is append-only';
END $$;
--> statement-breakpoint
CREATE TRIGGER marketing_consent_immutable BEFORE UPDATE OR DELETE ON marketing_consent_events
  FOR EACH ROW EXECUTE FUNCTION public.marketing_consent_immutable();
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.marketing_consent_immutable() FROM PUBLIC;
--> statement-breakpoint
-- This throttle lives in Postgres so parallel replicas share the same limit.
CREATE FUNCTION public.marketing_request_allowed(p_key text) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE current_limit public.marketing_request_limits%ROWTYPE;
BEGIN
  IF p_key IS NULL OR length(p_key) <> 64 THEN RETURN false; END IF;
  INSERT INTO public.marketing_request_limits(key, window_started_at, attempts)
    VALUES (p_key, now(), 0) ON CONFLICT (key) DO NOTHING;
  SELECT * INTO current_limit FROM public.marketing_request_limits WHERE key=p_key FOR UPDATE;
  IF current_limit.window_started_at < now() - interval '1 hour' THEN
    UPDATE public.marketing_request_limits SET window_started_at=now(), attempts=1 WHERE key=p_key;
    RETURN true;
  END IF;
  IF current_limit.attempts >= 5 THEN RETURN false; END IF;
  UPDATE public.marketing_request_limits SET attempts=attempts+1 WHERE key=p_key;
  RETURN true;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.marketing_request_allowed(text) FROM PUBLIC;
--> statement-breakpoint
CREATE FUNCTION public.marketing_request_subscription(
  p_subscriber_id text, p_email text, p_lookup_key text, p_locale text,
  p_wording_version text, p_wording_text text, p_source text, p_event_id text, p_token_id text,
  p_token_hash text, p_expires_at timestamptz, p_request_key text, p_request_id text
) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE person public.marketing_subscribers%ROWTYPE;
BEGIN
  IF NOT public.marketing_request_allowed(p_request_key) THEN RETURN false; END IF;
  IF p_locale NOT IN ('en','fr') OR p_source NOT IN ('public_form','account_preferences')
    OR length(btrim(p_wording_version)) < 3 OR length(btrim(p_wording_text)) < 10 OR length(p_email) > 254
    OR p_email !~ '^[^@[:space:]]+@[^@[:space:]]+$'
    OR lower(p_email) <> p_lookup_key
    OR p_expires_at <= now() OR p_expires_at > now() + interval '48 hours'
    OR length(p_token_hash) <> 64 THEN RETURN false; END IF;
  INSERT INTO public.marketing_subscribers(id,email,lookup_key,locale,status)
    VALUES (p_subscriber_id,p_email,p_lookup_key,p_locale,'suppressed')
    ON CONFLICT (lookup_key) DO NOTHING;
  SELECT * INTO person FROM public.marketing_subscribers WHERE lookup_key=p_lookup_key FOR UPDATE;
  IF person.status='confirmed' OR
    (person.last_request_at IS NOT NULL AND person.last_request_at > now() - interval '15 minutes')
    THEN RETURN false; END IF;
  INSERT INTO public.marketing_consent_events
    (id,subscriber_id,destination_email,event_type,locale,wording_version,wording_text,source,request_id)
    VALUES (p_event_id,person.id,p_email,'grant',p_locale,p_wording_version,p_wording_text,p_source,p_request_id);
  UPDATE public.marketing_subscribers SET
    email=p_email, locale=p_locale, status='pending_confirmation',
    latest_grant_id=p_event_id, wording_version=p_wording_version,
    last_request_at=now(), updated_at=now() WHERE id=person.id;
  INSERT INTO public.marketing_action_tokens
    (id,subscriber_id,token_hash,purpose,grant_event_id,expires_at)
    VALUES (p_token_id,person.id,p_token_hash,'confirm',p_event_id,p_expires_at);
  RETURN true;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.marketing_request_subscription(text,text,text,text,text,text,text,text,text,text,timestamptz,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.marketing_request_subscription(text,text,text,text,text,text,text,text,text,text,timestamptz,text,text) TO unionops_app;
--> statement-breakpoint
CREATE FUNCTION public.marketing_confirm_subscription(p_token_hash text, p_event_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE action_token public.marketing_action_tokens%ROWTYPE;
DECLARE person public.marketing_subscribers%ROWTYPE;
BEGIN
  SELECT * INTO action_token FROM public.marketing_action_tokens
    WHERE token_hash=p_token_hash AND purpose='confirm' FOR UPDATE;
  IF NOT FOUND OR action_token.expires_at <= now() THEN RETURN false; END IF;
  SELECT * INTO person FROM public.marketing_subscribers WHERE id=action_token.subscriber_id FOR UPDATE;
  IF action_token.consumed_at IS NOT NULL THEN
    RETURN person.status='confirmed' AND person.latest_grant_id IS NOT DISTINCT FROM action_token.grant_event_id;
  END IF;
  IF person.status <> 'pending_confirmation' OR person.latest_grant_id IS DISTINCT FROM action_token.grant_event_id THEN RETURN false; END IF;
  INSERT INTO public.marketing_consent_events (id,subscriber_id,destination_email,event_type,source,grant_event_id)
    VALUES (p_event_id,person.id,person.email,'confirmation','email_link',action_token.grant_event_id);
  UPDATE public.marketing_subscribers SET status='confirmed', updated_at=now() WHERE id=person.id;
  UPDATE public.marketing_action_tokens SET consumed_at=now() WHERE id=action_token.id;
  RETURN true;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.marketing_confirm_subscription(text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.marketing_confirm_subscription(text,text) TO unionops_app;
--> statement-breakpoint
CREATE FUNCTION public.marketing_issue_preferences(
  p_lookup_key text, p_token_id text, p_token_hash text,
  p_expires_at timestamptz, p_request_key text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE person public.marketing_subscribers%ROWTYPE;
BEGIN
  IF NOT public.marketing_request_allowed(p_request_key)
    OR p_expires_at <= now() OR p_expires_at > now() + interval '1 hour'
    OR length(p_token_hash) <> 64 THEN RETURN NULL; END IF;
  SELECT * INTO person FROM public.marketing_subscribers WHERE lookup_key=p_lookup_key FOR UPDATE;
  IF NOT FOUND OR (person.last_preferences_at IS NOT NULL AND person.last_preferences_at > now() - interval '15 minutes') THEN RETURN NULL; END IF;
  INSERT INTO public.marketing_action_tokens(id,subscriber_id,token_hash,purpose,expires_at)
    VALUES (p_token_id,person.id,p_token_hash,'preferences',p_expires_at);
  UPDATE public.marketing_subscribers SET last_preferences_at=now() WHERE id=person.id;
  RETURN person.email;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.marketing_issue_preferences(text,text,text,timestamptz,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.marketing_issue_preferences(text,text,text,timestamptz,text) TO unionops_app;
--> statement-breakpoint
CREATE FUNCTION public.marketing_preference_state(p_token_hash text)
RETURNS TABLE(email text, status text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  RETURN QUERY SELECT s.email,s.status FROM public.marketing_action_tokens t
    JOIN public.marketing_subscribers s ON s.id=t.subscriber_id
    WHERE t.token_hash=p_token_hash AND t.purpose IN ('preferences','unsubscribe')
      AND t.expires_at > now() AND t.consumed_at IS NULL;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.marketing_preference_state(text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.marketing_preference_state(text) TO unionops_app;
--> statement-breakpoint
CREATE FUNCTION public.marketing_unsubscribe(p_token_hash text, p_event_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE action_token public.marketing_action_tokens%ROWTYPE;
DECLARE person public.marketing_subscribers%ROWTYPE;
BEGIN
  SELECT * INTO action_token FROM public.marketing_action_tokens
    WHERE token_hash=p_token_hash AND purpose IN ('preferences','unsubscribe') AND expires_at > now();
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO person FROM public.marketing_subscribers WHERE id=action_token.subscriber_id FOR UPDATE;
  IF person.status <> 'suppressed' THEN
    INSERT INTO public.marketing_consent_events(id,subscriber_id,destination_email,event_type,source)
      VALUES (p_event_id,person.id,person.email,
        CASE WHEN action_token.purpose='preferences' THEN 'withdrawal' ELSE 'unsubscribe' END,
        'email_link');
    UPDATE public.marketing_subscribers SET status='suppressed',updated_at=now() WHERE id=person.id;
  END IF;
  RETURN true;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.marketing_unsubscribe(text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.marketing_unsubscribe(text,text) TO unionops_app;
--> statement-breakpoint
CREATE FUNCTION public.marketing_admin_suppress(
  p_lookup_key text, p_reason text, p_actor_id text, p_event_id text, p_request_id text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE person public.marketing_subscribers%ROWTYPE;
BEGIN
  IF NOT public.customization_root(NULL,true) OR length(btrim(p_reason)) < 8 THEN RETURN false; END IF;
  SELECT * INTO person FROM public.marketing_subscribers WHERE lookup_key=p_lookup_key FOR UPDATE;
  IF NOT FOUND OR person.latest_grant_id IS NULL THEN RETURN false; END IF;
  INSERT INTO public.marketing_consent_events(id,subscriber_id,destination_email,event_type,source,grant_event_id,reason,actor_id,request_id)
    VALUES (p_event_id,person.id,person.email,'admin_correction','site_admin',person.latest_grant_id,p_reason,p_actor_id,p_request_id);
  UPDATE public.marketing_subscribers SET status='suppressed',updated_at=now() WHERE id=person.id;
  RETURN true;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.marketing_admin_suppress(text,text,text,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.marketing_admin_suppress(text,text,text,text,text) TO unionops_app;
--> statement-breakpoint
CREATE FUNCTION public.marketing_issue_delivery_token(
  p_subscriber_id text, p_token_id text, p_token_hash text, p_expires_at timestamptz
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  IF current_setting('app.current_marketing_job', true) <> 'true'
    OR length(p_token_hash) <> 64
    OR p_expires_at < now() + interval '60 days'
    OR p_expires_at > now() + interval '1 year'
    OR NOT EXISTS (SELECT 1 FROM public.marketing_subscribers WHERE id=p_subscriber_id AND status='confirmed')
    THEN RETURN false; END IF;
  INSERT INTO public.marketing_action_tokens(id,subscriber_id,token_hash,purpose,expires_at)
    VALUES (p_token_id,p_subscriber_id,p_token_hash,'unsubscribe',p_expires_at);
  RETURN true;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.marketing_issue_delivery_token(text,text,text,timestamptz) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.marketing_issue_delivery_token(text,text,text,timestamptz) TO unionops_app;
--> statement-breakpoint
CREATE FUNCTION public.marketing_cleanup_transient() RETURNS TABLE(tokens_deleted integer, limits_deleted integer)
  LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE token_count integer;
DECLARE limit_count integer;
BEGIN
  IF current_setting('app.current_marketing_job', true) <> 'true' THEN
    RAISE EXCEPTION 'marketing job context required';
  END IF;
  DELETE FROM public.marketing_action_tokens WHERE expires_at < now() - interval '7 days';
  GET DIAGNOSTICS token_count = ROW_COUNT;
  DELETE FROM public.marketing_request_limits WHERE window_started_at < now() - interval '2 days';
  GET DIAGNOSTICS limit_count = ROW_COUNT;
  RETURN QUERY SELECT token_count,limit_count;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.marketing_cleanup_transient() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.marketing_cleanup_transient() TO unionops_app;
--> statement-breakpoint
CREATE FUNCTION public.marketing_record_provider_event(
  p_provider_event_id text, p_message_id text, p_event_type text, p_consent_event_id text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE target record;
BEGIN
  IF current_setting('app.current_marketing_job', true) <> 'true'
    OR p_event_type NOT IN ('temporary_failure','permanent_failure','complained','unsubscribed')
    OR length(btrim(p_provider_event_id)) < 8 OR length(btrim(p_message_id)) < 8 THEN RETURN false; END IF;
  SELECT d.id AS delivery_id,d.subscriber_id,s.email AS destination_email,s.status AS subscriber_status
    INTO target FROM public.marketing_deliveries d
    JOIN public.marketing_subscribers s ON s.id=d.subscriber_id
    WHERE btrim(d.provider_message_id,'<>')=btrim(p_message_id,'<>')
    ORDER BY d.finished_at DESC LIMIT 1 FOR UPDATE OF s;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.marketing_provider_events(id,delivery_id,event_type)
    VALUES (p_provider_event_id,target.delivery_id,p_event_type)
    ON CONFLICT (id) DO NOTHING;
  IF NOT FOUND THEN RETURN true; END IF;
  IF p_event_type='temporary_failure' THEN
    UPDATE public.marketing_deliveries SET error_code='provider_temporary_failure'
      WHERE id=target.delivery_id;
    RETURN true;
  END IF;
  UPDATE public.marketing_deliveries SET status=
    CASE WHEN p_event_type='permanent_failure' THEN 'failed' ELSE 'suppressed' END,
    error_code=
    CASE p_event_type WHEN 'permanent_failure' THEN 'provider_permanent_failure'
      WHEN 'complained' THEN 'provider_complaint' ELSE 'provider_unsubscribe' END
    WHERE id=target.delivery_id;
  IF target.subscriber_status <> 'suppressed' THEN
    INSERT INTO public.marketing_consent_events(id,subscriber_id,destination_email,event_type,source)
      VALUES (p_consent_event_id,target.subscriber_id,target.destination_email,
        CASE p_event_type WHEN 'permanent_failure' THEN 'provider_bounce'
          WHEN 'complained' THEN 'provider_complaint' ELSE 'unsubscribe' END,
        'mailgun_webhook');
    UPDATE public.marketing_subscribers SET status='suppressed',updated_at=now()
      WHERE id=target.subscriber_id;
  END IF;
  RETURN true;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.marketing_record_provider_event(text,text,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.marketing_record_provider_event(text,text,text,text) TO unionops_app;
