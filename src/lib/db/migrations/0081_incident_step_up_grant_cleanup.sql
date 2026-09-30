-- Cleanup inert platform incident step-up grants after expiry.
-- unionops_app cannot DELETE these rows directly (0070); only this function may.

CREATE OR REPLACE FUNCTION app_purge_expired_incident_step_up_grants()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  removed_count integer;
BEGIN
  IF current_setting('app.current_retention_job', true) <> 'true' THEN
    RAISE EXCEPTION 'retention job context required';
  END IF;
  DELETE FROM public.platform_incident_step_up_grants
    WHERE expires_at <= now();
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  RETURN removed_count;
END;
$$;

REVOKE ALL ON FUNCTION app_purge_expired_incident_step_up_grants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_purge_expired_incident_step_up_grants() TO unionops_app;

CREATE OR REPLACE FUNCTION app_count_expired_incident_step_up_grants()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  eligible_count integer;
BEGIN
  IF current_setting('app.current_retention_job', true) <> 'true' THEN
    RAISE EXCEPTION 'retention job context required';
  END IF;
  SELECT count(*)::integer INTO eligible_count
    FROM public.platform_incident_step_up_grants
    WHERE expires_at <= now();
  RETURN eligible_count;
END;
$$;

REVOKE ALL ON FUNCTION app_count_expired_incident_step_up_grants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_count_expired_incident_step_up_grants() TO unionops_app;
