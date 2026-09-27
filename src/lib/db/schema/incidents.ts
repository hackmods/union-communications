import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export type PlatformIncidentKind = "privacy" | "security" | "availability" | "other";
export type PlatformIncidentAffectedParty =
  | "members"
  | "officers"
  | "staff"
  | "customer_administrators"
  | "public_visitors"
  | "unknown"
  | "other";
export type PlatformIncidentSeverity = "low" | "moderate" | "high" | "critical";
export type PlatformIncidentStatus = "open" | "contained" | "closed";
export type PlatformIncidentNotificationDecision =
  | "not_assessed"
  | "not_required"
  | "required"
  | "completed";
export type IncidentStepUpAction = "view" | "create" | "update" | "export";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** Restricted UnionOps platform incident register. Narrative stays out of app error logs. */
export const platformIncidents = pgTable(
  "platform_incidents",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull().$type<PlatformIncidentKind>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull(),
    affectedSystem: text("affected_system").notNull(),
    dataCategories: text("data_categories").array().notNull(),
    affectedPartyCategories: text("affected_party_categories")
      .array()
      .notNull()
      .$type<PlatformIncidentAffectedParty[]>(),
    affectedIndividualEstimate: integer("affected_individual_estimate"),
    severity: text("severity").notNull().$type<PlatformIncidentSeverity>(),
    scopeSummary: text("scope_summary").notNull(),
    containmentSummary: text("containment_summary").notNull(),
    riskAssessment: text("risk_assessment").notNull(),
    notificationDecision: text("notification_decision")
      .notNull()
      .$type<PlatformIncidentNotificationDecision>(),
    notificationDecisionAt: timestamp("notification_decision_at", { withTimezone: true }),
    notificationRationale: text("notification_rationale").notNull(),
    remediationSummary: text("remediation_summary").notNull(),
    lessonsLearned: text("lessons_learned").notNull(),
    status: text("status").notNull().$type<PlatformIncidentStatus>(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: createdAt(),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("platform_incidents_updated_idx").on(table.updatedAt)],
);

/** Metadata-only, append-only evidence. Do not add incident narrative or member data here. */
export const platformIncidentAuditEvents = pgTable(
  "platform_incident_audit_events",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").notNull(),
    incidentId: text("incident_id"),
    requestId: text("request_id").notNull(),
    action: text("action").notNull(),
    outcome: text("outcome").notNull().default("success"),
    createdAt: createdAt(),
  },
  (table) => [
    index("platform_incident_audit_incident_idx").on(table.incidentId, table.createdAt),
    index("platform_incident_audit_actor_idx").on(table.actorId, table.createdAt),
    index("platform_incident_audit_action_idx").on(table.action, table.createdAt),
  ],
);

/** One short-lived, action-bound proof issued after a fresh per-user TOTP challenge. */
export const platformIncidentStepUpGrants = pgTable(
  "platform_incident_step_up_grants",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    action: text("action").notNull().$type<IncidentStepUpAction>(),
    resourceId: text("resource_id").notNull().default(""),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("platform_incident_step_up_token_uidx").on(table.tokenHash),
    index("platform_incident_step_up_actor_idx").on(table.actorId, table.createdAt),
    index("platform_incident_step_up_expiry_idx").on(table.expiresAt),
  ],
);
