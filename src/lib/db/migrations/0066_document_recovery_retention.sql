-- A narrowly scoped recovery operation: restores one exact archived record and
-- returns its tenant coordinates only. It never returns private file metadata.
CREATE OR REPLACE FUNCTION app_restore_archived_document(target_document_id text)
RETURNS TABLE (union_id text, local_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF current_setting('app.current_platform_admin', true) <> 'true'
     OR current_setting('app.current_mfa_verified', true) <> 'true' THEN
    RAISE EXCEPTION 'platform administrator MFA required';
  END IF;
  RETURN QUERY UPDATE public.documents d
    SET archived_at = NULL, archived_by_id = NULL
    WHERE d.id = target_document_id AND d.archived_at IS NOT NULL
    RETURNING d.union_id, d.local_id;
END;
$$;
REVOKE ALL ON FUNCTION app_restore_archived_document(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_restore_archived_document(text) TO unionops_app;

-- Retention functions expose only expired archived object keys, and only while
-- the server has opened the authenticated retention job context.
CREATE OR REPLACE FUNCTION app_list_expired_documents()
RETURNS TABLE (document_id text, storage_keys text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF current_setting('app.current_retention_job', true) <> 'true' THEN
    RAISE EXCEPTION 'retention job context required';
  END IF;
  RETURN QUERY
    SELECT d.id, ARRAY(
      SELECT DISTINCT keys.storage_key FROM (
        SELECT d.storage_key
        UNION ALL
        SELECT v.storage_key FROM public.document_versions v WHERE v.document_id = d.id
      ) AS keys WHERE keys.storage_key IS NOT NULL
    )
    FROM public.documents d
    WHERE d.archived_at IS NOT NULL AND d.retention_until IS NOT NULL
      AND d.retention_until <= now() AND d.legal_hold = false
    FOR UPDATE OF d;
END;
$$;
REVOKE ALL ON FUNCTION app_list_expired_documents() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_list_expired_documents() TO unionops_app;

CREATE OR REPLACE FUNCTION app_purge_expired_documents(target_document_ids text[])
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE removed_count integer;
BEGIN
  IF current_setting('app.current_retention_job', true) <> 'true' THEN
    RAISE EXCEPTION 'retention job context required';
  END IF;
  DELETE FROM public.documents d
    WHERE d.id = ANY(target_document_ids) AND d.archived_at IS NOT NULL
      AND d.retention_until IS NOT NULL AND d.retention_until <= now() AND d.legal_hold = false;
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  RETURN removed_count;
END;
$$;
REVOKE ALL ON FUNCTION app_purge_expired_documents(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_purge_expired_documents(text[]) TO unionops_app;
