-- Personal Terms acceptance is an ordinary individual action. Organization
-- acceptance remains restricted to a verified MFA session and live authority.
DROP POLICY IF EXISTS public_document_acceptances_subject_insert ON public_document_acceptances;
CREATE POLICY public_document_acceptances_subject_insert ON public_document_acceptances FOR INSERT WITH CHECK (
  accepted_by_id = nullif(current_setting('app.current_user_id', true), '')
  AND (
    (subject_type = 'individual'
      AND subject_id = nullif(current_setting('app.current_user_id', true), '')
      AND authority_attested = false
      AND authority_attestation_version IS NULL
      AND authority_attested_at IS NULL)
    OR (subject_type = 'union'
      AND current_setting('app.current_mfa_verified', true) = 'true'
      AND subject_id = nullif(current_setting('app.current_union_id', true), '')
      AND authority_attested = true
      AND authority_attestation_version = 'unionops-organization-acceptance-v1'
      AND authority_attested_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = nullif(current_setting('app.current_user_id', true), '')
          AND u.union_id = subject_id
          AND u.roles ? 'union_admin'
          AND u.archived_at IS NULL
          AND u.locked_at IS NULL))
    OR (subject_type = 'local'
      AND current_setting('app.current_mfa_verified', true) = 'true'
      AND subject_id = nullif(current_setting('app.current_local_id', true), '')
      AND authority_attested = true
      AND authority_attestation_version = 'unionops-organization-acceptance-v1'
      AND authority_attested_at IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM officer_assignments a
        WHERE a.user_id = nullif(current_setting('app.current_user_id', true), '')
          AND a.union_id = nullif(current_setting('app.current_union_id', true), '')
          AND a.local_id = subject_id
          AND a.position IN ('president', 'vice_president')
          AND a.revoked_at IS NULL
          AND a.starts_at <= now()
          AND (a.ends_at IS NULL OR a.ends_at > now())))
  )
);
