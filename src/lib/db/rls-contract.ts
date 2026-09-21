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
    table: "checkin_schedules",
    policy: "checkin_schedules_tenant_isolation",
    migration: "0025_checkins.sql",
  },
  {
    table: "checkin_answers",
    policy: "checkin_answers_tenant_isolation",
    migration: "0025_checkins.sql",
  },
  {
    table: "officer_learning_users",
    policy: "officer_learning_users_tenant_isolation",
    migration: "0034_officer_learning.sql",
  },
  {
    table: "officer_learning_local_settings",
    policy: "officer_learning_local_settings_tenant_isolation",
    migration: "0034_officer_learning.sql",
  },
  {
    table: "local_meeting_schedules",
    policy: "local_meeting_schedules_tenant_isolation",
    migration: "0018_local_meeting_schedule.sql",
  },
  {
    table: "union_meetings",
    policy: "union_meetings_tenant_isolation",
    migration: "0019_union_meetings_rsvp.sql",
  },
  {
    table: "rsvp_tokens",
    policy: "rsvp_tokens_tenant_isolation",
    migration: "0019_union_meetings_rsvp.sql",
  },
  {
    table: "rsvp_responses",
    policy: "rsvp_responses_tenant_isolation",
    migration: "0019_union_meetings_rsvp.sql",
  },
  {
    table: "pto_requests",
    policy: "pto_requests_tenant_isolation",
    migration: "0020_pto_requests.sql",
  },
  {
    table: "time_shifts",
    policy: "time_shifts_tenant_isolation",
    migration: "0021_time_shifts.sql",
  },
  {
    table: "pto_balances",
    policy: "pto_balances_tenant_isolation",
    migration: "0022_pto_balances.sql",
  },
  {
    table: "time_worker_groups",
    policy: "time_worker_groups_tenant_isolation",
    migration: "0028_time_full8.sql",
  },
  {
    table: "time_ot_policies",
    policy: "time_ot_policies_tenant_isolation",
    migration: "0028_time_full8.sql",
  },
  {
    table: "time_shift_series",
    policy: "time_shift_series_tenant_isolation",
    migration: "0028_time_full8.sql",
  },
  {
    table: "pto_accrual_policies",
    policy: "pto_accrual_policies_tenant_isolation",
    migration: "0028_time_full8.sql",
  },
  {
    table: "payroll_export_profiles",
    policy: "payroll_export_profiles_tenant_isolation",
    migration: "0028_time_full8.sql",
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
  {
    table: "officer_roster",
    policy: "officer_roster_tenant_isolation",
    migration: "0011_officer_roster.sql",
  },
  {
    table: "meeting_minutes",
    policy: "meeting_minutes_tenant_isolation",
    migration: "0012_meeting_minutes.sql",
  },
  {
    table: "ledger_entries",
    policy: "ledger_entries_tenant_isolation",
    migration: "0013_ledger.sql",
  },
  {
    table: "committees",
    policy: "committees_tenant_isolation",
    migration: "0014_committees.sql",
  },
  {
    table: "election_cycles",
    policy: "election_cycles_tenant_isolation",
    migration: "0015_elections.sql",
  },
  {
    table: "travel_authorizations",
    policy: "travel_authorizations_tenant_isolation",
    migration: "0016_travel.sql",
  },
  {
    table: "cash_advances",
    policy: "cash_advances_tenant_isolation",
    migration: "0016_travel.sql",
  },
  {
    table: "expense_claims",
    policy: "expense_claims_tenant_isolation",
    migration: "0016_travel.sql",
  },
  {
    table: "expense_submissions",
    policy: "expense_submissions_tenant_isolation",
    migration: "0026_expense_submissions.sql",
  },
  {
    table: "poll_definitions",
    policy: "poll_definitions_tenant_isolation",
    migration: "0017_polls.sql",
  },
  {
    table: "poll_responses",
    policy: "poll_responses_tenant_isolation",
    migration: "0017_polls.sql",
  },
  {
    table: "union_public_tool_settings",
    policy: "union_public_tool_settings_tenant_isolation",
    migration: "0038_public_tool_settings.sql",
  },
  {
    table: "local_public_tool_settings",
    policy: "local_public_tool_settings_tenant_isolation",
    migration: "0038_public_tool_settings.sql",
  },
  {
    table: "bylaw_drafts",
    policy: "bylaw_drafts_tenant_isolation",
    migration: "0039_hub_bylaws_proposals.sql",
  },
  {
    table: "proposal_packages",
    policy: "proposal_packages_tenant_isolation",
    migration: "0039_hub_bylaws_proposals.sql",
  },
  {
    table: "proposal_rows",
    policy: "proposal_rows_tenant_isolation",
    migration: "0039_hub_bylaws_proposals.sql",
  },
  {
    table: "proposal_events",
    policy: "proposal_events_tenant_isolation",
    migration: "0039_hub_bylaws_proposals.sql",
  },
  {
    table: "proposal_publications",
    policy: "proposal_publications_tenant_isolation",
    migration: "0039_hub_bylaws_proposals.sql",
  },
  { table: "data_datasets", policy: "data_datasets_tenant_isolation", migration: "0040_data_workbench.sql" },
  { table: "data_import_runs", policy: "data_import_runs_tenant_isolation", migration: "0040_data_workbench.sql" },
  { table: "data_staged_rows", policy: "data_staged_rows_tenant_isolation", migration: "0040_data_workbench.sql" },
  { table: "data_publications", policy: "data_publications_tenant_isolation", migration: "0040_data_workbench.sql" },
  { table: "data_records", policy: "data_records_tenant_isolation", migration: "0040_data_workbench.sql" },
  { table: "data_people", policy: "data_people_tenant_isolation", migration: "0040_data_workbench.sql" },
  { table: "data_identifiers", policy: "data_identifiers_tenant_isolation", migration: "0040_data_workbench.sql" },
  { table: "data_assertions", policy: "data_assertions_tenant_isolation", migration: "0040_data_workbench.sql" },
  { table: "data_employment_assignments", policy: "data_employment_assignments_tenant_isolation", migration: "0040_data_workbench.sql" },
  { table: "data_union_memberships", policy: "data_union_memberships_tenant_isolation", migration: "0040_data_workbench.sql" },
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
