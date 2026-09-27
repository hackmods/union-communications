CREATE TABLE IF NOT EXISTS public_documents (
  id text PRIMARY KEY,
  slug text NOT NULL,
  status text NOT NULL CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  current_version integer NOT NULL CHECK (current_version > 0),
  published_version integer,
  scheduled_version integer,
  brand_preset_id text,
  host_wide_policy boolean NOT NULL DEFAULT false,
  publish_at timestamptz,
  archived_at timestamptz,
  created_by_id text NOT NULL,
  updated_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_documents_slug_uidx UNIQUE (slug)
);
CREATE INDEX IF NOT EXISTS public_documents_status_publish_idx ON public_documents (status, publish_at);

CREATE TABLE IF NOT EXISTS public_document_versions (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES public_documents(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  payload jsonb NOT NULL,
  created_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_document_versions_doc_version_uidx UNIQUE (document_id, version)
);
CREATE INDEX IF NOT EXISTS public_document_versions_doc_idx ON public_document_versions (document_id, created_at);

CREATE TABLE IF NOT EXISTS public_document_acceptances (
  id text PRIMARY KEY,
  document_version_id text NOT NULL REFERENCES public_document_versions(id) ON DELETE RESTRICT,
  resource_slug text NOT NULL,
  subject_type text NOT NULL CHECK (subject_type IN ('individual', 'union', 'local')),
  subject_id text NOT NULL,
  accepted_by_id text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_document_acceptances_subject_uidx UNIQUE (document_version_id, subject_type, subject_id)
);
CREATE INDEX IF NOT EXISTS public_document_acceptances_subject_idx ON public_document_acceptances (subject_type, subject_id, accepted_at);

ALTER TABLE public_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_document_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_documents_public_read ON public_documents;
CREATE POLICY public_documents_public_read ON public_documents FOR SELECT USING (
  ((status = 'published' AND archived_at IS NULL AND (publish_at IS NULL OR publish_at <= now()))
    OR (status = 'scheduled' AND archived_at IS NULL AND (publish_at <= now() OR published_version IS NOT NULL)))
  OR slug IN ('privacy', 'security', 'accessibility', 'workplace-map-template', 'steward-intake-template', 'workplace-map-example', 'board-tracker-sample', 'jhsc-member-list-sample', 'esa-employment-poster', 'ontario-required-posters', 'wsib-form-82', 'opseu-collective-agreements', 'opseu-eerc-minutes')
  OR (current_setting('app.current_platform_admin', true) = 'true' AND current_setting('app.current_mfa_verified', true) = 'true')
);
DROP POLICY IF EXISTS public_documents_admin_insert ON public_documents;
CREATE POLICY public_documents_admin_insert ON public_documents FOR INSERT WITH CHECK (
  current_setting('app.current_platform_admin', true) = 'true' AND current_setting('app.current_mfa_verified', true) = 'true'
);
DROP POLICY IF EXISTS public_documents_admin_update ON public_documents;
CREATE POLICY public_documents_admin_update ON public_documents FOR UPDATE
  USING (current_setting('app.current_platform_admin', true) = 'true' AND current_setting('app.current_mfa_verified', true) = 'true')
  WITH CHECK (current_setting('app.current_platform_admin', true) = 'true' AND current_setting('app.current_mfa_verified', true) = 'true');
DROP POLICY IF EXISTS public_documents_admin_delete ON public_documents;
CREATE POLICY public_documents_admin_delete ON public_documents FOR DELETE USING (
  current_setting('app.current_platform_admin', true) = 'true' AND current_setting('app.current_mfa_verified', true) = 'true'
);

DROP POLICY IF EXISTS public_document_versions_public_current ON public_document_versions;
CREATE POLICY public_document_versions_public_current ON public_document_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public_documents d WHERE d.id = document_id AND d.archived_at IS NULL AND (
    (d.status = 'published' AND (d.publish_at IS NULL OR d.publish_at <= now()) AND COALESCE(d.published_version, d.current_version) = version)
    OR (d.status = 'scheduled' AND d.publish_at > now() AND d.published_version = version)
    OR (d.status = 'scheduled' AND d.publish_at <= now() AND COALESCE(d.scheduled_version, d.current_version) = version)
  ))
  OR (current_setting('app.current_platform_admin', true) = 'true' AND current_setting('app.current_mfa_verified', true) = 'true')
);
DROP POLICY IF EXISTS public_document_versions_admin_insert ON public_document_versions;
CREATE POLICY public_document_versions_admin_insert ON public_document_versions FOR INSERT WITH CHECK (
  current_setting('app.current_platform_admin', true) = 'true' AND current_setting('app.current_mfa_verified', true) = 'true'
);
DROP POLICY IF EXISTS public_document_acceptances_subject_read ON public_document_acceptances;
CREATE POLICY public_document_acceptances_subject_read ON public_document_acceptances FOR SELECT USING (
  (subject_type = 'individual' AND subject_id = nullif(current_setting('app.current_user_id', true), ''))
  OR (subject_type = 'union' AND subject_id = nullif(current_setting('app.current_union_id', true), ''))
  OR (subject_type = 'local' AND subject_id = nullif(current_setting('app.current_local_id', true), ''))
  OR (current_setting('app.current_platform_admin', true) = 'true' AND current_setting('app.current_mfa_verified', true) = 'true')
);
DROP POLICY IF EXISTS public_document_acceptances_subject_insert ON public_document_acceptances;
CREATE POLICY public_document_acceptances_subject_insert ON public_document_acceptances FOR INSERT WITH CHECK (
  accepted_by_id = nullif(current_setting('app.current_user_id', true), '')
  AND current_setting('app.current_mfa_verified', true) = 'true'
  AND ((subject_type = 'individual' AND subject_id = nullif(current_setting('app.current_user_id', true), ''))
    OR (subject_type = 'union' AND subject_id = nullif(current_setting('app.current_union_id', true), '')
      AND EXISTS (SELECT 1 FROM users u WHERE u.id = nullif(current_setting('app.current_user_id', true), '') AND u.union_id = subject_id AND u.roles ? 'union_admin' AND u.archived_at IS NULL AND u.locked_at IS NULL))
    OR (subject_type = 'local' AND subject_id = nullif(current_setting('app.current_local_id', true), '')
      AND EXISTS (SELECT 1 FROM officer_assignments a WHERE a.user_id = nullif(current_setting('app.current_user_id', true), '')
        AND a.union_id = nullif(current_setting('app.current_union_id', true), '') AND a.local_id = subject_id
        AND a.position IN ('president', 'vice_president') AND a.revoked_at IS NULL AND a.starts_at <= now() AND (a.ends_at IS NULL OR a.ends_at > now())))
  )
);
DROP POLICY IF EXISTS public_document_acceptances_admin_update ON public_document_acceptances;
CREATE POLICY public_document_acceptances_admin_update ON public_document_acceptances FOR UPDATE
  USING (current_setting('app.current_platform_admin', true) = 'true' AND current_setting('app.current_mfa_verified', true) = 'true')
  WITH CHECK (current_setting('app.current_platform_admin', true) = 'true' AND current_setting('app.current_mfa_verified', true) = 'true');

COMMENT ON TABLE public_documents IS 'Public document library record heads; global only, never grants private Hub access.';
COMMENT ON TABLE public_document_versions IS 'Append-only public document revisions and immutable object provenance.';
