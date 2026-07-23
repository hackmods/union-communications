/**
 * Documented RLS policy contract (SEC-003 / ADR-008).
 *
 * Unit tests assert migration SQL matches this list without a live database.
 * Live enforcement is checked by `scripts/rls-smoke.ts` (app role + session vars).
 */

export interface RlsPolicyContract {
  table: string;
  policy: string;
  /** Migration file that ENABLE + CREATE POLICY this row */
  migration: string;
}

/** Every tenant isolation policy expected in shipped migrations. */
export const RLS_TENANT_POLICIES: readonly RlsPolicyContract[] = [
  {
    table: "grievances",
    policy: "grievances_tenant_isolation",
    migration: "0002_rls_policies.sql",
  },
  {
    table: "bumping_cases",
    policy: "bumping_cases_tenant_isolation",
    migration: "0002_rls_policies.sql",
  },
  {
    table: "audit_log",
    policy: "audit_log_tenant_isolation",
    migration: "0002_rls_policies.sql",
  },
  {
    table: "member_communications",
    policy: "member_communications_tenant_isolation",
    migration: "0002_rls_policies.sql",
  },
  {
    table: "scheduled_meetings",
    policy: "scheduled_meetings_tenant_isolation",
    migration: "0002_rls_policies.sql",
  },
  {
    table: "time_entries",
    policy: "time_entries_tenant_isolation",
    migration: "0005_time_rls.sql",
  },
  {
    table: "job_codes",
    policy: "job_codes_tenant_isolation",
    migration: "0005_time_rls.sql",
  },
  {
    table: "work_sites",
    policy: "work_sites_tenant_isolation",
    migration: "0005_time_rls.sql",
  },
  {
    table: "time_workers",
    policy: "time_workers_tenant_isolation",
    migration: "0005_time_rls.sql",
  },
  {
    table: "time_expected_windows",
    policy: "time_expected_windows_tenant_isolation",
    migration: "0005_time_rls.sql",
  },
  {
    table: "attachment_meta",
    policy: "attachment_meta_tenant_isolation",
    migration: "0006_attachments.sql",
  },
  {
    table: "documents",
    policy: "documents_tenant_isolation",
    migration: "0006_attachments.sql",
  },
  {
    table: "discussion_threads",
    policy: "discussion_threads_tenant_isolation",
    migration: "0007_discussions.sql",
  },
  {
    table: "discussion_posts",
    policy: "discussion_posts_tenant_isolation",
    migration: "0007_discussions.sql",
  },
  {
    table: "tasks",
    policy: "tasks_tenant_isolation",
    migration: "0009_tasks.sql",
  },
  {
    table: "informal_log_entries",
    policy: "informal_log_entries_tenant_isolation",
    migration: "0010_informal_log.sql",
  },
] as const;

/** App role that must not own tables / must not bypass RLS. */
export const APP_DB_ROLE = "unionops_app";

export const APP_ROLE_MIGRATION = "0008_app_role.sql";

/** Session GUCs set by `applyRlsContext` and referenced in policies. */
export const RLS_SESSION_VARS = [
  "app.current_union_id",
  "app.current_local_id",
  "app.current_cross_local",
] as const;
