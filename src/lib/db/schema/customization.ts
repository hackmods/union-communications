import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import type { CustomizationLayer, CustomizationResource, Audience } from "@/lib/customization/types";

const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const scopeColumns = () => ({ scopeId: text("scope_id").notNull(), unionId: text("union_id") });
// Additional tenant-shape / immutable-history constraints and triggers live in 0054.
export const customizationScopes = pgTable("customization_scopes", {
  id: text("id").primaryKey(), kind: text("kind").notNull(), unionId: text("union_id"),
  divisionId: text("division_id"), localId: text("local_id"), bargainingUnitId: text("bargaining_unit_id"),
  parentScopeId: text("parent_scope_id"), archivedAt: timestamp("archived_at", { withTimezone: true }), createdAt: created(),
});
export const customizationResources = pgTable("customization_resources", {
  id: text("id").primaryKey(), ...scopeColumns(), key: text("key").notNull(), kind: text("kind").notNull(),
  slug: text("slug"), createdBy: text("created_by").notNull(), createdAt: created(), archivedAt: timestamp("archived_at", { withTimezone: true }),
}, (t) => [uniqueIndex("customization_resource_scope_key").on(t.scopeId, t.key), uniqueIndex("customization_resource_scope_slug").on(t.scopeId, t.slug)]);
export const customizationDrafts = pgTable("customization_drafts", {
  resourceId: text("resource_id").primaryKey(), ...scopeColumns(), payload: jsonb("payload").notNull().$type<CustomizationLayer>(),
  baseReleaseId: text("base_release_id"), ancestorHeads: jsonb("ancestor_heads").notNull().$type<Record<string, string>>().default({}),
  reviews: jsonb("reviews").notNull().$type<Record<string, { hash: string; reviewedBy: string; reviewedAt: string }>>().default({}),
  schemaVersion: integer("schema_version").notNull(), lockVersion: integer("lock_version").notNull(), updatedBy: text("updated_by").notNull(), updatedAt: updated(),
});
export const customizationRevisions = pgTable("customization_revisions", {
  id: text("id").primaryKey(), resourceId: text("resource_id").notNull(), ...scopeColumns(), revisionNo: integer("revision_no").notNull(),
  schemaVersion: integer("schema_version").notNull(), payload: jsonb("payload").notNull().$type<CustomizationLayer>(),
  contentHash: text("content_hash").notNull(), createdBy: text("created_by").notNull(), changeReason: text("change_reason").notNull(), createdAt: created(),
}, (t) => [uniqueIndex("customization_revision_number").on(t.resourceId, t.revisionNo)]);
export const customizationReleases = pgTable("customization_releases", {
  id: text("id").primaryKey(), resourceId: text("resource_id").notNull(), ...scopeColumns(), revisionId: text("revision_id").notNull(),
  dependencyManifest: jsonb("dependency_manifest").notNull().$type<Record<string, string>>(), compiledDefaultVersion: text("compiled_default_version").notNull(),
  resolved: jsonb("resolved").$type<CustomizationResource>(), publishedBy: text("published_by").notNull(), createdAt: created(), replacesReleaseId: text("replaces_release_id"),
});
export const customizationHeads = pgTable("customization_heads", {
  resourceId: text("resource_id").primaryKey(), ...scopeColumns(), activeReleaseId: text("active_release_id"), generation: integer("generation").notNull(), updatedAt: updated(),
});
export const customizationPolicies = pgTable("customization_policy", {
  resourceId: text("resource_id").primaryKey(), ...scopeColumns(), audience: text("audience").notNull().$type<Audience>(),
  enabled: boolean("enabled").notNull(), withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }), publicListing: boolean("public_listing").notNull().default(false),
  publicTeaser: jsonb("public_teaser").$type<{ en: string; fr: string }>(), policyVersion: integer("policy_version").notNull(),
  editableFields: jsonb("editable_fields").notNull().$type<string[]>(), entitlementKey: text("entitlement_key"), updatedBy: text("updated_by").notNull(),
});
export const customizationSectionControls = pgTable("customization_section_controls", {
  id: text("id").primaryKey(), resourceId: text("resource_id").notNull(), ...scopeColumns(), blockId: text("block_id").notNull(),
  minimumAudience: text("minimum_audience").notNull().$type<Audience>(), withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }), policyVersion: integer("policy_version").notNull(), updatedBy: text("updated_by").notNull(),
}, (t) => [uniqueIndex("customization_section_resource_block").on(t.resourceId, t.blockId)]);
export const customizationDeliveryFragments = pgTable("customization_delivery_fragments", {
  id: text("id").primaryKey(), releaseId: text("release_id").notNull(), resourceId: text("resource_id").notNull(), ...scopeColumns(),
  locale: text("locale").notNull(), fragmentId: text("fragment_id").notNull(), kind: text("kind").notNull(), ordinal: integer("ordinal").notNull(),
  minimumAudience: text("minimum_audience").notNull().$type<Audience>(), payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
  controlResourceIds: jsonb("control_resource_ids").notNull().$type<string[]>().default([]),
}, (t) => [uniqueIndex("customization_fragment_identity").on(t.releaseId, t.locale, t.fragmentId), index("customization_fragments_scope_locale").on(t.scopeId, t.locale)]);
export const customizationPublicProjections = pgTable("customization_public_projections", {
  id: text("id").primaryKey(), resourceId: text("resource_id").notNull(), releaseId: text("release_id").notNull(), ...scopeColumns(),
  locale: text("locale").notNull(), publicDto: jsonb("public_dto").notNull().$type<Record<string, unknown>>(), policyVersion: integer("policy_version").notNull(),
}, (t) => [uniqueIndex("customization_projection_identity").on(t.releaseId, t.locale)]);
export const customizationMaintenanceGrants = pgTable("customization_maintenance_grants", {
  id: text("id").primaryKey(), ...scopeColumns(), userId: text("user_id").notNull(), capabilities: jsonb("capabilities").notNull().$type<string[]>(), resourceKinds: jsonb("resource_kinds").notNull().$type<string[]>(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(), endsAt: timestamp("ends_at", { withTimezone: true }).notNull(), revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedBy: text("revoked_by"), grantedBy: text("granted_by").notNull(), reason: text("reason").notNull(), createdAt: created(),
}, (t) => [index("customization_grant_user_union").on(t.userId, t.unionId, t.endsAt)]);
export const customizationPresetBindings = pgTable("customization_preset_bindings", {
  id: text("id").primaryKey(), ...scopeColumns(), presetId: text("preset_id").notNull(), sectorId: text("sector_id").notNull().default(""), publishedAt: timestamp("published_at", { withTimezone: true }), updatedBy: text("updated_by").notNull(),
}, (t) => [uniqueIndex("customization_preset_sector").on(t.presetId, t.sectorId)]);
export const customizationAssets = pgTable("customization_assets", {
  id: text("id").primaryKey(), ...scopeColumns(), storageKey: text("storage_key").notNull(), mime: text("mime").notNull(), bytes: integer("bytes").notNull(),
  hash: text("hash").notNull(), scanStatus: text("scan_status").notNull(), rightsNote: text("rights_note").notNull(), altText: jsonb("alt_text").notNull().$type<{ en: string; fr: string }>(), createdBy: text("created_by").notNull(), createdAt: created(),
});
export const customizationAudit = pgTable("customization_audit", {
  id: text("id").primaryKey(), ...scopeColumns(), actorId: text("actor_id").notNull(), action: text("action").notNull(), resourceId: text("resource_id"),
  metadata: jsonb("metadata").notNull().$type<Record<string, unknown>>(), reason: text("reason").notNull(), createdAt: created(),
});
export const customizationOperations = pgTable("customization_operations", {
  id: text("id").primaryKey(), ...scopeColumns(), actorId: text("actor_id").notNull(), operationKey: text("operation_key").notNull(), requestHash: text("request_hash").notNull(), result: jsonb("result").notNull().$type<Record<string, unknown>>(), createdAt: created(),
}, (t) => [uniqueIndex("customization_operation_idempotency").on(t.actorId, t.scopeId, t.operationKey)]);
