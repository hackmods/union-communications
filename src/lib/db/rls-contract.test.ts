import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APP_DB_ROLE,
  APP_ROLE_MIGRATION,
  RLS_SESSION_VARS,
  RLS_TENANT_POLICIES,
} from "@/lib/db/rls-contract";

const migrationsDir = join(process.cwd(), "src/lib/db/migrations");

function readMigration(name: string): string {
  return readFileSync(join(migrationsDir, name), "utf8");
}

describe("RLS policy contract (no live DB)", () => {
  it("lists session GUCs used by applyRlsContext / policies", () => {
    expect(RLS_SESSION_VARS).toEqual([
      "app.current_union_id",
      "app.current_local_id",
      "app.current_user_id",
      "app.current_cross_local",
      "app.current_mfa_verified",
    ]);
  });

  it("migration SQL ENABLE + CREATE POLICY for every contracted table", () => {
    const byMigration = new Map<string, string>();
    for (const row of RLS_TENANT_POLICIES) {
      if (!byMigration.has(row.migration)) {
        byMigration.set(row.migration, readMigration(row.migration));
      }
      const sql = byMigration.get(row.migration)!;
      if ("dynamic" in row && row.dynamic) {
        expect(sql).toContain(`'${row.table}'`);
        expect(sql).toContain("ALTER TABLE %I ENABLE ROW LEVEL SECURITY");
        expect(sql).toContain("CREATE POLICY %I ON %I");
        expect(sql).toContain("app.current_union_id");
        expect(sql).toContain("app.current_local_id");
        continue;
      }
      const enableSql = sql.includes(`ALTER TABLE ${row.table} ENABLE ROW LEVEL SECURITY`)
        ? sql
        : readMigration("0044_authorization_rls_hardening.sql");
      expect(enableSql).toContain(
        `ALTER TABLE ${row.table} ENABLE ROW LEVEL SECURITY`,
      );
      expect(sql).toMatch(
        new RegExp(`CREATE POLICY\\s+${row.policy}\\s+ON\\s+${row.table}`),
      );
      if (row.table === "mfa_recovery_codes" || row.table === "mfa_totp_counters" || row.table === "mfa_session_grants" || row.table === "mfa_verification_attempts") {
        expect(sql).toContain("app.current_user_id");
        continue;
      }
      if (row.table.startsWith("subprocessor_")) {
        expect(sql).toContain("public.customization_root(NULL, true)");
        if (row.policy === "subprocessor_public_active_read") {
          expect(sql).toContain('"effective_from" <= now()');
          expect(sql).toContain('"effective_to" > now()');
        }
        if (row.policy === "subprocessor_audit_operator_insert") {
          expect(sql).toContain("FOR INSERT WITH CHECK");
        }
        continue;
      }
      // Circle memberships are explicit cross-local relationships. Preferences
      // stay union-bound and actor-bound, while the membership itself decides
      // the Circle; requiring the currently selected local would break invited
      // union Circles for users in another local.
      if (row.migration === "0051_committee_membership_scope.sql") {
        expect(sql).toContain("app_org_manage(");
        continue;
      }
      const requiredGucs = row.migration === "0045_portal_write_policy_completion.sql"
        || row.migration === "0046_portal_membership_integrity.sql"
        || row.migration === "0047_portal_circle_creator_read.sql"
        || row.migration === "0048_portal_circle_insert_returning.sql"
        || row.migration === "0049_portal_circle_membership_returning.sql"
        || row.migration === "0050_portal_sidebar_creator_returning.sql"
        || row.migration === "0052_portal_archive_access.sql"
        || row.table === "portal_roll_call_answers"
        ? ["app.current_union_id", "app.current_user_id"]
        : ["app.current_union_id", "app.current_local_id"];
      for (const guc of requiredGucs) {
        expect(sql).toContain(guc);
      }
    }
  });

  it("0008 creates non-owner app role without BYPASSRLS", () => {
    const sql = readMigration(APP_ROLE_MIGRATION);
    const codeOnly = sql
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("--"))
      .join("\n");
    expect(codeOnly).toContain(`CREATE ROLE ${APP_DB_ROLE}`);
    expect(codeOnly).toMatch(/NOBYPASSRLS/);
    expect(codeOnly).toMatch(/NOSUPERUSER/);
    expect(codeOnly).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public",
    );
    expect(codeOnly).toMatch(/GRANT CONNECT ON DATABASE/);
    // After removing NOBYPASSRLS tokens, no affirmative BYPASSRLS remains in DDL.
    expect(codeOnly.replaceAll("NOBYPASSRLS", "")).not.toMatch(/\bBYPASSRLS\b/);
  });

  it("journal includes app role migration before tasks", () => {
    const journal = JSON.parse(
      readFileSync(join(migrationsDir, "meta/_journal.json"), "utf8"),
    ) as { entries: { tag: string }[] };
    const tags = journal.entries.map((e) => e.tag);
    expect(tags).toContain("0008_app_role");
    expect(tags.indexOf("0008_app_role")).toBeLessThan(
      tags.indexOf("0009_tasks"),
    );
  });

  it("fails closed for absent local scope and requires relationships for sensitive children", () => {
    const sql = readMigration("0044_authorization_rls_hardening.sql");
    expect(sql).not.toContain("current_setting(''app.current_local_id'', true) IS NULL");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION app_grievance_case_access");
    expect(sql).toContain("app_grievance_case_access(grievance_id, true)");
    expect(sql).toContain("grievance_member_updates_member_safe_read");
    expect(sql).toContain("app_grievance_member(grievance_id");
  });

  it("keeps processor review internal and publishes only an approved active projection", () => {
    const sql = readMigration("0065_subprocessor_registry.sql");
    expect(sql).toContain("ALTER TABLE subprocessor_registry FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("CREATE POLICY subprocessor_registry_operator_all ON subprocessor_registry");
    expect(sql).toContain("public.customization_root(NULL, true)");
    expect(sql).toContain("CREATE POLICY subprocessor_public_active_read ON subprocessor_public_projections");
    expect(sql).toContain("CREATE POLICY subprocessor_public_publish_insert ON subprocessor_public_projections");
    expect(sql).toContain("r.review_status = 'approved'");
    expect(sql).toContain("r.public_disclosure_approved");
    expect(sql).toContain('"reviewed_by" IS DISTINCT FROM "updated_by"');
    expect(sql).toContain('length(btrim("verification_evidence")) > 0');
    expect(sql).toContain("CREATE TRIGGER subprocessor_public_projection_guard");
    expect(sql).toContain("FOR SHARE");
    expect(sql).toContain('"effective_from" <= now()');
    expect(sql).toContain('"effective_to" > now()');
    expect(sql).toContain("ALTER TABLE subprocessor_audit_events FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("REVOKE UPDATE, DELETE ON subprocessor_audit_events FROM unionops_app");
    const publicTable = sql.split("CREATE TABLE subprocessor_public_projections (")[1]?.split(");")[0] ?? "";
    expect(publicTable).toContain("public_notes");
    expect(publicTable).not.toContain("internal_notes");
    expect(publicTable).not.toContain("dpa_status");
    expect(sql).not.toContain("CREATE POLICY subprocessor_registry_public_read");
  });

  it("limits Circle roster writes to Circle administrators", () => {
    const sql = readMigration("0044_authorization_rls_hardening.sql");
    expect(sql).toContain("CREATE POLICY portal_circle_memberships_creator_insert");
    expect(sql).toContain("app_portal_circle_admin(circle_id");
    expect(sql).not.toContain("WITH CHECK (app_portal_circle_member(circle_id, nullif(current_setting('app.current_user_id', true), '')) OR");
    expect(sql).toContain("app_portal_circle_writer(circle_id");
  });

  it("allows self-service Circle preferences without self-granted roles", () => {
    const sql = readMigration("0045_portal_write_policy_completion.sql");
    expect(sql).toContain("portal_circle_memberships_self_preferences_update");
    expect(sql).toContain("app_guard_portal_circle_membership_update");
    expect(sql).toContain("NEW.role IS DISTINCT FROM OLD.role");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION app_create_portal_dispatch");
    expect(sql).toContain("app_portal_circle_writer(target_circle, actor_id)");
    expect(sql).toContain("portal_sidebar_messages_participant_insert");
    expect(sql).toContain("author_id = nullif(current_setting('app.current_user_id', true), '')");
  });

  it("limits explicit Portal participants to active same-union accounts and deduplicates Sidebar pairs", () => {
    const sql = readMigration("0046_portal_membership_integrity.sql");
    const adapter = readFileSync(join(process.cwd(), "src/lib/portal/postgres-adapter.ts"), "utf8");
    const authorization = readMigration("0044_authorization_rls_hardening.sql");
    expect(sql).toContain("app_portal_active_union_user(user_id");
    expect(sql).toContain("u.archived_at IS NULL AND u.locked_at IS NULL");
    expect(sql).toContain("portal_sidebar_threads_pair_uidx");
    expect(adapter).toContain("pg_advisory_xact_lock");
    expect(authorization).toContain("app_org_manage(union_id, local_id, 'circles.create')");
    expect(authorization).toContain("capability IN ('memberships.manage','officers.manage','circles.create')");
  });

  it("allows a Circle creator to read the newly inserted row returned during setup", () => {
    const sql = readMigration("0048_portal_circle_insert_returning.sql");
    expect(sql).toContain("app_portal_circle_member(id");
    expect(sql).toContain("created_by_id = nullif(current_setting('app.current_user_id', true), '')");
    expect(sql).toContain("union_id = nullif(current_setting('app.current_union_id', true), '')");
  });

  it("allows only the same-union Circle creator to read their bootstrap roster row", () => {
    const sql = readMigration("0049_portal_circle_membership_returning.sql");
    expect(sql).toContain("user_id = nullif(current_setting('app.current_user_id', true), '')");
    expect(sql).toContain("app_portal_circle_creator(circle_id");
    expect(sql).toContain("c.union_id = nullif(current_setting('app.current_union_id', true), '')");
  });

  it("allows only the union-scoped Sidebar creator to read the thread during creation", () => {
    const sql = readMigration("0050_portal_sidebar_creator_returning.sql");
    expect(sql).toContain("union_id = nullif(current_setting('app.current_union_id', true), '')");
    expect(sql).toContain("created_by_id = nullif(current_setting('app.current_user_id', true), '')");
    expect(sql).toContain("app_portal_sidebar_participant(id");
  });

  it("revokes Circle and child access after archival while preserving the archive transaction", () => {
    const sql = readMigration("0052_portal_archive_access.sql");
    expect(sql).toContain("JOIN portal_circles c ON c.id = m.circle_id");
    expect(sql).toContain("m.user_id = target_user AND c.archived_at IS NULL");
    expect(sql).toContain("m.role IN ('member','admin') AND c.archived_at IS NULL");
    expect(sql).toContain("archived_at IS NOT NULL");
    expect(sql).toContain("app_portal_circle_admin(id");
    expect(sql).toContain("c.archived_at IS NULL");
    expect(sql).toContain("CREATE POLICY portal_circle_memberships_admin_update");
    expect(sql).toContain("CREATE POLICY portal_circle_memberships_admin_delete");
  });

  it("keeps normalized organization writes behind capability policies", () => {
    const sql = readMigration("0044_authorization_rls_hardening.sql");
    for (const table of ["local_memberships", "officer_assignments", "authority_delegations", "committee_memberships"]) {
      expect(sql).toContain(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
    }
    expect(sql).toContain("CREATE POLICY authority_delegations_manage_insert");
    expect(sql).toContain("app_org_manage(union_id, local_id, 'delegations.manage')");
  });

  it("binds committee account links to a same-scope committee and active local members", () => {
    const sql = readMigration("0051_committee_membership_scope.sql");
    expect(sql).toContain("committee_memberships_committee_scope_fk");
    expect(sql).toContain('FOREIGN KEY ("committee_id", "union_id", "local_id")');
    expect(sql).toContain("app_org_manage(union_id, local_id, 'officers.manage')");
    expect(sql).toContain("lm.status = 'active'");
    expect(sql).toContain("lm.ended_at IS NULL");
    expect(sql).toContain("lm.started_at <= now()");
    expect(sql).toContain("u.archived_at IS NULL");
    expect(sql).toContain("u.locked_at IS NULL");
    expect(sql).toContain("u.union_id = committee_memberships.union_id");
  });

  it("requires verified MFA and an exact-resource definer function for break-glass writes", () => {
    const sql = readMigration("0044_authorization_rls_hardening.sql");
    expect(sql).toContain("app.current_mfa_verified");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION app_create_break_glass_grant(target_grievance text, grant_reason text)");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION app_revoke_break_glass_grant(target_grievance text)");
    expect(sql).not.toContain("CREATE POLICY break_glass_grants_actor_scope ON break_glass_grants FOR ALL");
  });

  it("restricts the platform incident register, step-up grants, and append-only metadata audit", () => {
    const sql = readMigration("0066_platform_incident_register.sql");
    expect(sql).toContain("ALTER TABLE platform_incidents FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("public.customization_root(NULL, true)");
    expect(sql).toContain("actor_id = nullif(current_setting('app.current_user_id', true), '')");
    expect(sql).toContain("CREATE POLICY platform_incident_audit_operator_insert");
    expect(sql).not.toContain("CREATE POLICY platform_incidents_operator_all");
    expect(sql).toContain("REVOKE DELETE ON platform_incidents FROM unionops_app");
    expect(sql).toContain("NEW.created_by IS DISTINCT FROM actor");
    expect(sql).toContain("platform_incident_audit_actor_guard");
    const auditPolicyStart = sql.indexOf("CREATE POLICY platform_incident_audit_operator_insert");
    const stepUpPolicyStart = sql.indexOf("ALTER TABLE platform_incident_step_up_grants");
    expect(sql.slice(auditPolicyStart, stepUpPolicyStart)).toContain(
      "actor_id = nullif(current_setting('app.current_user_id', true), '')",
    );
    expect(sql).toContain("CREATE TRIGGER platform_incident_audit_immutable");
    expect(sql).toContain("REVOKE UPDATE, DELETE ON platform_incident_audit_events FROM unionops_app");
    expect(sql).toContain("CREATE TRIGGER platform_incident_step_up_consume_guard");
    expect(sql).not.toContain("before_record");
    expect(sql).not.toContain("after_record");
  });

  it("stores the current TOTP replay counter under account-scoped RLS", () => {
    const sql = readMigration("0067_mfa_totp_replay_guard.sql");
    expect(sql).toContain("ALTER TABLE mfa_totp_counters ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("ALTER TABLE mfa_totp_counters FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("user_id = nullif(current_setting('app.current_user_id', true), '')");
    expect(sql).toContain("CHECK (last_counter >= 0)");
    expect(sql).toContain("REVOKE DELETE ON mfa_totp_counters FROM unionops_app");
  });

  it("stores only account-scoped single-use MFA grant state", () => {
    const sql = readMigration("0068_mfa_session_grants.sql");
    expect(sql).toContain("token_hash text NOT NULL CHECK (length(token_hash) = 64)");
    expect(sql).toContain("ALTER TABLE mfa_session_grants FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("mfa_session_grants_user_select");
    expect(sql).toContain("mfa_session_grants_user_insert");
    expect(sql).toContain("mfa_session_grants_user_update");
    expect(sql).toContain("REVOKE DELETE ON mfa_session_grants FROM unionops_app");
  });

  it("adds audit outcomes and request correlation while making runtime audit append-only", () => {
    const sql = readMigration("0070_audit_outcome_request_correlation.sql");
    expect(sql).toContain("ADD COLUMN outcome text NOT NULL DEFAULT 'unknown'");
    expect(sql).toContain("ADD COLUMN request_id text");
    expect(sql).toContain("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
    expect(sql).toContain("ALTER COLUMN outcome SET DEFAULT 'success'");
    expect(sql).toContain("CREATE INDEX audit_log_request_idx");
    expect(sql).toContain("REVOKE UPDATE, DELETE ON audit_log FROM unionops_app");
  });

  it("limits MFA verification attempts under account-scoped RLS", () => {
    const sql = readMigration("0069_mfa_verification_attempts.sql");
    expect(sql).toContain("CHECK (attempt_count BETWEEN 1 AND 10)");
    expect(sql).toContain("ALTER TABLE mfa_verification_attempts FORCE ROW LEVEL SECURITY");
    expect(sql).toContain("mfa_verification_attempts_user_select");
    expect(sql).toContain("mfa_verification_attempts_user_insert");
    expect(sql).toContain("mfa_verification_attempts_user_update");
    expect(sql).toContain("REVOKE DELETE ON mfa_verification_attempts FROM unionops_app");
  });

  it("removes role-array writes from the legacy officer roster policy", () => {
    const sql = readMigration("0044_authorization_rls_hardening.sql");
    expect(sql).toContain("DROP POLICY IF EXISTS officer_roster_tenant_isolation ON officer_roster");
    expect(sql).toContain("CREATE POLICY officer_roster_manage_insert ON officer_roster");
    expect(sql).toContain("app_org_manage(union_id, local_id, 'officers.manage')");
  });
});
