-- Durable double opt-in confirmation for outreach list subscribers (ADR-023).

CREATE OR REPLACE FUNCTION public.outreach_confirm_from_token(
  p_token_hash text,
  p_event_id text,
  p_source text DEFAULT 'email_link'
) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
  action_token public.outreach_action_tokens%ROWTYPE;
  subscriber public.outreach_subscribers%ROWTYPE;
  notice_version text := 'outreach-list-2026-09-v1';
BEGIN
  IF length(p_token_hash) <> 64 OR length(btrim(p_event_id)) < 8 THEN
    RETURN false;
  END IF;
  SELECT * INTO action_token FROM public.outreach_action_tokens
    WHERE token_hash = p_token_hash
      AND purpose = 'confirm'
      AND expires_at > now()
      AND consumed_at IS NULL
    FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  SELECT * INTO subscriber FROM public.outreach_subscribers
    WHERE id = action_token.subscriber_id
    FOR UPDATE;
  IF NOT FOUND OR subscriber.status = 'suppressed' THEN
    RETURN false;
  END IF;
  IF subscriber.status = 'confirmed'
    AND subscriber.wording_version = notice_version THEN
    UPDATE public.outreach_action_tokens
      SET consumed_at = now()
      WHERE id = action_token.id;
    RETURN true;
  END IF;
  UPDATE public.outreach_subscribers
    SET status = 'confirmed',
        wording_version = notice_version,
        updated_at = now()
    WHERE id = subscriber.id;
  INSERT INTO public.outreach_consent_events (
    id, subscriber_id, union_id, list_id, destination_email,
    event_type, locale, wording_version, wording_text, source,
    grant_event_id, actor_id
  ) VALUES (
    p_event_id,
    subscriber.id,
    subscriber.union_id,
    subscriber.list_id,
    lower(subscriber.email),
    'confirmation',
    subscriber.locale,
    notice_version,
    CASE subscriber.locale
      WHEN 'fr' THEN
        'Je souhaite recevoir par courriel des messages de cette organisation syndicale sur ses programmes et campagnes. Je peux me désabonner en tout temps. Ce n''est pas une liste d''envoi locale aux membres.'
      ELSE
        'I want email from this union organization about its programs and campaigns. I can unsubscribe at any time. This is not a local member broadcast list.'
    END,
    p_source,
    COALESCE(action_token.grant_event_id, subscriber.latest_grant_id),
    NULL
  );
  UPDATE public.outreach_action_tokens
    SET consumed_at = now()
    WHERE id = action_token.id;
  RETURN true;
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.outreach_confirm_from_token(text,text,text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.outreach_confirm_from_token(text,text,text) TO unionops_app;
