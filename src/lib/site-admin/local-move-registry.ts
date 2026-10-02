/**
 * Allowlists for Site Admin in-place Local Move (cross-union reparent).
 *
 * Tables with both `union_id` and `local_id` are rewritten with:
 *   UPDATE "{table}" SET union_id = $dest
 *   WHERE local_id = $local AND union_id = $source
 *
 * Portal / customization children that only denormalize `union_id` are
 * rewritten via join on the local-scoped parent. Historical `audit_log` and
 * the `locals` / `users` rows themselves are handled outside this list.
 */

import { DEMO_PURGE_UNION_SCOPED_TABLES } from "@/lib/site-admin/demo-purge";

/** Dual-key tables rewritten by `local_id` + source `union_id`. */
export const LOCAL_MOVE_UNION_ID_TABLES: readonly string[] = [
  // Core org
  "bargaining_units",
  "local_memberships",
  "officer_assignments",
  "authority_delegations",
  "committee_memberships",
  "break_glass_grants",
  "user_invites",
  "local_public_tool_settings",
  "ca_snippets",
  "access_requests",
  // Portal (local-keyed parent)
  "portal_circles",
  // Member broadcast
  "member_broadcast_consents",
  "member_broadcast_campaigns",
  "member_broadcast_action_tokens",
  "member_broadcast_deliveries",
  "member_broadcast_suppressions",
  // Hub governance
  "bylaw_drafts",
  "proposal_packages",
  "proposal_rows",
  "proposal_events",
  "proposal_publications",
  // Data workbench
  "data_datasets",
  "data_import_runs",
  "data_staged_rows",
  "data_publications",
  "data_records",
  "data_people",
  "data_identifiers",
  "data_assertions",
  "data_employment_assignments",
  "data_union_memberships",
  // Document vault extras (parents also in demo purge)
  "document_versions",
  "document_access_grants",
  // Customization root scopes (children via LOCAL_MOVE_SCOPE_CHILD_TABLES)
  "customization_scopes",
  // Local Brand Kit defaults (hybrid Brand Kit / migration 0095)
  "local_brand_kits",
  // Casework / modules (same breadth as demo purge)
  ...DEMO_PURGE_UNION_SCOPED_TABLES,
] as const;

/**
 * Portal child tables that carry `union_id` but not `local_id`.
 * Rewritten via join on `portal_circles` for the moved local.
 */
export const LOCAL_MOVE_CIRCLE_CHILD_TABLES: readonly {
  table: string;
  circleFk: string;
}[] = [
  { table: "portal_bulletin_posts", circleFk: "circle_id" },
  { table: "portal_actions", circleFk: "circle_id" },
  { table: "portal_calendar_events", circleFk: "circle_id" },
  { table: "portal_binder_items", circleFk: "circle_id" },
  { table: "portal_floor_messages", circleFk: "circle_id" },
  { table: "portal_roll_call_questions", circleFk: "circle_id" },
  { table: "portal_pipeline_boards", circleFk: "circle_id" },
  { table: "portal_momentum_items", circleFk: "circle_id" },
  { table: "portal_dispatch_items", circleFk: "circle_id" },
] as const;

/**
 * Customization rows that denormalize `union_id` via `scope_id`.
 * Rewritten where the scope is local-scoped to the moved local.
 */
export const LOCAL_MOVE_SCOPE_CHILD_TABLES: readonly string[] = [
  "customization_resources",
  "customization_drafts",
  "customization_revisions",
  "customization_releases",
  "customization_heads",
  "customization_policy",
  "customization_section_controls",
  "customization_delivery_fragments",
  "customization_public_projections",
  "customization_maintenance_grants",
  "customization_preset_bindings",
  "customization_assets",
  "customization_audit",
  "customization_operations",
] as const;

/**
 * Dual-key (or dual-key-shaped) tables that must NOT be cascade-rewritten.
 * Completeness tests require every other dual-key schema table to be listed
 * in LOCAL_MOVE_UNION_ID_TABLES or here with a rationale.
 */
export const LOCAL_MOVE_EXCLUDED_TABLES: readonly {
  table: string;
  reason: string;
}[] = [
  {
    table: "locals",
    reason: "Root row — updated explicitly in executeLocalMove",
  },
  {
    table: "users",
    reason: "Home tenancy + session_version bumped with membership-aware rules",
  },
  {
    table: "audit_log",
    reason: "Append-only evidence — move appends site_admin.local.move only",
  },
  {
    table: "portal_sidebar_threads",
    reason: "Union-scoped DMs (no local_id); not reparented with a local",
  },
] as const;

/** Deduped allowlist used by the cascade engine (stable order, first wins). */
export function uniqueLocalMoveUnionIdTables(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const table of LOCAL_MOVE_UNION_ID_TABLES) {
    if (seen.has(table)) continue;
    seen.add(table);
    out.push(table);
  }
  return out;
}

export function isLocalMoveExcluded(table: string): boolean {
  return LOCAL_MOVE_EXCLUDED_TABLES.some((row) => row.table === table);
}
