ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'local_shared',
  ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by_id text,
  ADD COLUMN IF NOT EXISTS legal_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS retention_until timestamptz;

CREATE INDEX IF NOT EXISTS documents_archive_idx ON documents (union_id, local_id, archived_at);
UPDATE documents SET retention_until = created_at + interval '7 years' WHERE retention_until IS NULL;

CREATE TABLE IF NOT EXISTS document_versions (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  union_id text NOT NULL REFERENCES unions(id) ON DELETE RESTRICT,
  local_id text NOT NULL REFERENCES locals(id) ON DELETE RESTRICT,
  version integer NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  storage_key text NOT NULL,
  sha256 text,
  scan_status text NOT NULL,
  uploaded_by_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_versions_document_version_uidx UNIQUE (document_id, version)
);
CREATE INDEX IF NOT EXISTS document_versions_scope_idx ON document_versions (union_id, local_id, document_id);

CREATE TABLE IF NOT EXISTS document_access_grants (
  id text PRIMARY KEY,
  document_id text NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  union_id text NOT NULL REFERENCES unions(id) ON DELETE RESTRICT,
  local_id text NOT NULL REFERENCES locals(id) ON DELETE RESTRICT,
  user_id text NOT NULL,
  granted_by_id text NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_access_grants_document_user_uidx UNIQUE (document_id, user_id)
);
CREATE INDEX IF NOT EXISTS document_access_grants_user_scope_idx ON document_access_grants (union_id, local_id, user_id, revoked_at);

-- Version existing metadata without changing union/local ownership. Hashes remain
-- NULL until the storage-backed integrity job verifies each immutable object.
INSERT INTO document_versions (id, document_id, union_id, local_id, version, file_name, mime_type, size_bytes, storage_key, sha256, scan_status, uploaded_by_id, created_at)
SELECT id || '-v1', id, union_id, local_id, 1, file_name, mime_type, size_bytes, storage_key, NULL, scan_status, uploaded_by_id, created_at
FROM documents
ON CONFLICT (document_id, version) DO NOTHING;

-- Preserve existing ownership and local scope. Version 1 rows are populated only when
-- bytes can be verified by the runtime backfill/readiness process; SQL cannot hash objects.
-- Keep the legacy document rows readable while the application is rolled forward.

-- Existing grievance tenants receive the new independent Documents module.
UPDATE unions
SET enabled_modules = CASE
  WHEN enabled_modules ? 'documents' THEN enabled_modules
  ELSE enabled_modules || '["documents"]'::jsonb
END
WHERE enabled_modules ? 'grievance';

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_versions_tenant_isolation ON document_versions;
CREATE POLICY document_versions_tenant_isolation ON document_versions FOR ALL
  USING (union_id = nullif(current_setting('app.current_union_id', true), '')
    AND local_id = nullif(current_setting('app.current_local_id', true), ''))
  WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '')
    AND local_id = nullif(current_setting('app.current_local_id', true), ''));
DROP POLICY IF EXISTS document_access_grants_tenant_isolation ON document_access_grants;
CREATE POLICY document_access_grants_tenant_isolation ON document_access_grants FOR ALL
  USING (union_id = nullif(current_setting('app.current_union_id', true), '')
    AND local_id = nullif(current_setting('app.current_local_id', true), ''))
  WITH CHECK (union_id = nullif(current_setting('app.current_union_id', true), '')
    AND local_id = nullif(current_setting('app.current_local_id', true), ''));
