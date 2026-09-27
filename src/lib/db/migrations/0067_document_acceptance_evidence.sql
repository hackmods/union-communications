ALTER TABLE public_document_acceptances
  ADD COLUMN IF NOT EXISTS request_id text,
  ADD COLUMN IF NOT EXISTS acceptance_source text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS authority_attested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS authority_attestation_version text,
  ADD COLUMN IF NOT EXISTS authority_attested_at timestamptz;

ALTER TABLE public_document_acceptances
  DROP CONSTRAINT IF EXISTS public_document_acceptances_source_check,
  ADD CONSTRAINT public_document_acceptances_source_check
    CHECK (acceptance_source IN ('legacy', 'document_acceptance_page')),
  DROP CONSTRAINT IF EXISTS public_document_acceptances_authority_check,
  ADD CONSTRAINT public_document_acceptances_authority_check CHECK (
    acceptance_source = 'legacy'
    OR (subject_type = 'individual' AND authority_attested = false
      AND authority_attestation_version IS NULL AND authority_attested_at IS NULL)
    OR (subject_type IN ('union', 'local') AND authority_attested = true
      AND authority_attestation_version = 'unionops-organization-acceptance-v1'
      AND authority_attested_at IS NOT NULL)
  );

DROP POLICY IF EXISTS public_document_acceptances_admin_update ON public_document_acceptances;
DROP POLICY IF EXISTS public_document_acceptances_subject_insert ON public_document_acceptances;
CREATE POLICY public_document_acceptances_subject_insert ON public_document_acceptances FOR INSERT WITH CHECK (
  accepted_by_id = nullif(current_setting('app.current_user_id', true), '')
  AND current_setting('app.current_mfa_verified', true) = 'true'
  AND ((subject_type = 'individual' AND subject_id = nullif(current_setting('app.current_user_id', true), '')
      AND authority_attested = false AND authority_attestation_version IS NULL AND authority_attested_at IS NULL)
    OR (subject_type = 'union' AND subject_id = nullif(current_setting('app.current_union_id', true), '')
      AND authority_attested = true AND authority_attestation_version = 'unionops-organization-acceptance-v1' AND authority_attested_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = nullif(current_setting('app.current_user_id', true), '') AND u.union_id = subject_id AND u.roles ? 'union_admin' AND u.archived_at IS NULL AND u.locked_at IS NULL))
    OR (subject_type = 'local' AND subject_id = nullif(current_setting('app.current_local_id', true), '')
      AND authority_attested = true AND authority_attestation_version = 'unionops-organization-acceptance-v1' AND authority_attested_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM officer_assignments a WHERE a.user_id = nullif(current_setting('app.current_user_id', true), '')
        AND a.union_id = nullif(current_setting('app.current_union_id', true), '') AND a.local_id = subject_id
        AND a.position IN ('president', 'vice_president') AND a.revoked_at IS NULL AND a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())))
  )
);

CREATE OR REPLACE FUNCTION reject_public_document_acceptance_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'public document acceptance evidence is append-only';
END;
$$;
DROP TRIGGER IF EXISTS public_document_acceptances_append_only ON public_document_acceptances;
CREATE TRIGGER public_document_acceptances_append_only
  BEFORE UPDATE OR DELETE ON public_document_acceptances
  FOR EACH ROW EXECUTE FUNCTION reject_public_document_acceptance_mutation();

REVOKE UPDATE, DELETE ON TABLE public_document_acceptances FROM PUBLIC, unionops_app;

COMMENT ON COLUMN public_document_acceptances.request_id IS 'Server-generated correlation ID for the acceptance request; null on historical rows.';
COMMENT ON COLUMN public_document_acceptances.acceptance_source IS 'Evidence capture flow; legacy marks rows created before the acceptance contract.';
COMMENT ON COLUMN public_document_acceptances.authority_attested IS 'Whether the actor affirmed authority to accept for an organization.';
