-- Restricted platform incident register and action-bound MFA step-up grants.
-- Keep incident narrative in this controlled register, never in error logs or audit metadata.
CREATE TABLE platform_incidents (
  id text PRIMARY KEY NOT NULL,
  kind text NOT NULL CHECK (kind IN ('privacy', 'security', 'availability', 'other')),
  occurred_at timestamp with time zone,
  discovered_at timestamp with time zone NOT NULL,
  affected_system text NOT NULL CHECK (length(btrim(affected_system)) BETWEEN 1 AND 160),
  data_categories text[] NOT NULL CHECK (cardinality(data_categories) BETWEEN 1 AND 20),
  affected_party_categories text[] NOT NULL CHECK (
    cardinality(affected_party_categories) BETWEEN 1 AND 7
    AND affected_party_categories <@ ARRAY['members', 'officers', 'staff', 'customer_administrators', 'public_visitors', 'unknown', 'other']::text[]
  ),
  affected_individual_estimate integer CHECK (affected_individual_estimate IS NULL OR affected_individual_estimate >= 0),
  severity text NOT NULL CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
  scope_summary text NOT NULL CHECK (length(btrim(scope_summary)) BETWEEN 1 AND 5000),
  containment_summary text NOT NULL CHECK (length(btrim(containment_summary)) BETWEEN 1 AND 5000),
  risk_assessment text NOT NULL CHECK (length(btrim(risk_assessment)) BETWEEN 1 AND 5000),
  notification_decision text NOT NULL CHECK (notification_decision IN ('not_assessed', 'not_required', 'required', 'completed')),
  notification_decision_at timestamp with time zone,
  notification_rationale text NOT NULL CHECK (length(btrim(notification_rationale)) BETWEEN 1 AND 5000),
  remediation_summary text NOT NULL CHECK (length(btrim(remediation_summary)) BETWEEN 1 AND 5000),
  lessons_learned text NOT NULL CHECK (length(btrim(lessons_learned)) BETWEEN 1 AND 5000),
  status text NOT NULL CHECK (status IN ('open', 'contained', 'closed')),
  closed_at timestamp with time zone,
  last_reviewed_at timestamp with time zone,
  created_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT platform_incidents_closed_state CHECK ((status = 'closed') = (closed_at IS NOT NULL)),
  CONSTRAINT platform_incidents_timeline CHECK (
    (occurred_at IS NULL OR occurred_at <= discovered_at)
    AND ((notification_decision = 'not_assessed' AND notification_decision_at IS NULL)
      OR (notification_decision <> 'not_assessed' AND notification_decision_at IS NOT NULL AND notification_decision_at >= discovered_at))
  )
);
--> statement-breakpoint
CREATE INDEX platform_incidents_updated_idx ON platform_incidents (updated_at DESC);
--> statement-breakpoint
CREATE TABLE platform_incident_audit_events (
  id text PRIMARY KEY NOT NULL,
  actor_id text NOT NULL,
  incident_id text,
  request_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('viewed', 'created', 'updated', 'closed', 'reopened', 'exported', 'step_up_failed', 'access_denied')),
  outcome text NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'denied')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT platform_incident_audit_request_uuid CHECK (request_id ~ '^[0-9a-fA-F-]{36}$')
);
--> statement-breakpoint
CREATE INDEX platform_incident_audit_incident_idx ON platform_incident_audit_events (incident_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX platform_incident_audit_actor_idx ON platform_incident_audit_events (actor_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX platform_incident_audit_action_idx ON platform_incident_audit_events (action, created_at DESC);
--> statement-breakpoint
CREATE TABLE platform_incident_step_up_grants (
  id text PRIMARY KEY NOT NULL,
  actor_id text NOT NULL,
  token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  action text NOT NULL CHECK (action IN ('view', 'create', 'update', 'export')),
  resource_id text NOT NULL DEFAULT '',
  expires_at timestamp with time zone NOT NULL,
  consumed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX platform_incident_step_up_token_uidx ON platform_incident_step_up_grants (token_hash);
--> statement-breakpoint
CREATE INDEX platform_incident_step_up_actor_idx ON platform_incident_step_up_grants (actor_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX platform_incident_step_up_expiry_idx ON platform_incident_step_up_grants (expires_at);
--> statement-breakpoint
ALTER TABLE platform_incidents ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE platform_incidents FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY platform_incidents_operator_read ON platform_incidents
  FOR SELECT USING (public.customization_root(NULL, true));
--> statement-breakpoint
CREATE POLICY platform_incidents_operator_insert ON platform_incidents
  FOR INSERT WITH CHECK (public.customization_root(NULL, true));
--> statement-breakpoint
CREATE POLICY platform_incidents_operator_update ON platform_incidents
  FOR UPDATE USING (public.customization_root(NULL, true))
  WITH CHECK (public.customization_root(NULL, true));
--> statement-breakpoint
REVOKE DELETE ON platform_incidents FROM unionops_app;
--> statement-breakpoint
CREATE FUNCTION public.platform_incident_record_actor_guard() RETURNS trigger
  LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE actor text := nullif(current_setting('app.current_user_id', true), '');
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'platform incident actor context is required';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS DISTINCT FROM actor THEN
      RAISE EXCEPTION 'platform incident creator must match the authenticated actor';
    END IF;
    NEW.created_at := now();
  ELSIF NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'platform incident creator and creation time are immutable';
  END IF;
  NEW.updated_by := actor;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER platform_incident_record_actor_guard
  BEFORE INSERT OR UPDATE ON platform_incidents
  FOR EACH ROW EXECUTE FUNCTION public.platform_incident_record_actor_guard();
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.platform_incident_record_actor_guard() FROM PUBLIC;
--> statement-breakpoint
ALTER TABLE platform_incident_audit_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE platform_incident_audit_events FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY platform_incident_audit_operator_read ON platform_incident_audit_events
  FOR SELECT USING (public.customization_root(NULL, true));
--> statement-breakpoint
CREATE POLICY platform_incident_audit_operator_insert ON platform_incident_audit_events
  FOR INSERT WITH CHECK (
    actor_id = nullif(current_setting('app.current_user_id', true), '')
    AND public.customization_root(NULL, true)
  );
--> statement-breakpoint
CREATE FUNCTION public.platform_incident_audit_actor_guard() RETURNS trigger
  LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE actor text := nullif(current_setting('app.current_user_id', true), '');
BEGIN
  IF actor IS NULL OR NEW.actor_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'incident audit actor must match the authenticated actor';
  END IF;
  NEW.created_at := now();
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER platform_incident_audit_actor_guard
  BEFORE INSERT ON platform_incident_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.platform_incident_audit_actor_guard();
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.platform_incident_audit_actor_guard() FROM PUBLIC;
--> statement-breakpoint
ALTER TABLE platform_incident_step_up_grants ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE platform_incident_step_up_grants FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY platform_incident_step_up_actor_select ON platform_incident_step_up_grants
  FOR SELECT USING (actor_id = nullif(current_setting('app.current_user_id', true), '') AND public.customization_root(NULL, true));
--> statement-breakpoint
CREATE POLICY platform_incident_step_up_actor_insert ON platform_incident_step_up_grants
  FOR INSERT WITH CHECK (actor_id = nullif(current_setting('app.current_user_id', true), '') AND public.customization_root(NULL, true));
--> statement-breakpoint
CREATE POLICY platform_incident_step_up_actor_update ON platform_incident_step_up_grants
  FOR UPDATE USING (actor_id = nullif(current_setting('app.current_user_id', true), '') AND public.customization_root(NULL, true))
  WITH CHECK (actor_id = nullif(current_setting('app.current_user_id', true), '') AND public.customization_root(NULL, true));
--> statement-breakpoint
REVOKE DELETE ON platform_incident_step_up_grants FROM unionops_app;
--> statement-breakpoint
CREATE FUNCTION public.platform_incident_step_up_consume_only() RETURNS trigger
  LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  IF OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL
    OR NEW.id IS DISTINCT FROM OLD.id
    OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
    OR NEW.token_hash IS DISTINCT FROM OLD.token_hash
    OR NEW.action IS DISTINCT FROM OLD.action
    OR NEW.resource_id IS DISTINCT FROM OLD.resource_id
    OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'incident step-up grants may only be consumed once';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER platform_incident_step_up_consume_guard
  BEFORE UPDATE ON platform_incident_step_up_grants
  FOR EACH ROW EXECUTE FUNCTION public.platform_incident_step_up_consume_only();
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.platform_incident_step_up_consume_only() FROM PUBLIC;
--> statement-breakpoint
CREATE FUNCTION public.platform_incident_audit_immutable() RETURNS trigger
  LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  RAISE EXCEPTION 'platform incident audit history is append-only';
END $$;
--> statement-breakpoint
CREATE TRIGGER platform_incident_audit_immutable
  BEFORE UPDATE OR DELETE ON platform_incident_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.platform_incident_audit_immutable();
--> statement-breakpoint
REVOKE UPDATE, DELETE ON platform_incident_audit_events FROM unionops_app;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.platform_incident_audit_immutable() FROM PUBLIC;
