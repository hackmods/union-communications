import {
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { bargainingUnits, locals, unions, users } from "./tenant";
import { committees } from "./committees";

export const localMemberships = pgTable(
  "local_memberships",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "cascade" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    bargainingUnitId: text("bargaining_unit_id").references(() => bargainingUnits.id, { onDelete: "set null" }),
    status: text("status").notNull().$type<"active" | "inactive">().default("active"),
    isPrimary: boolean("is_primary").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("local_memberships_user_local_uidx").on(t.userId, t.localId),
    uniqueIndex("local_memberships_primary_active_uidx")
      .on(t.unionId, t.userId)
      .where(
        sql`${t.isPrimary} = true AND ${t.status} = 'active' AND ${t.endedAt} IS NULL`,
      ),
    index("local_memberships_union_local_idx").on(t.unionId, t.localId),
    index("local_memberships_user_status_idx").on(t.userId, t.status),
  ],
);

export type OfficerPosition = "president" | "vice_president" | "grievance_officer" | "steward" | "executive_member";
export const officerAssignments = pgTable(
  "officer_assignments",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "cascade" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    position: text("position").notNull().$type<OfficerPosition>(),
    officerRosterId: text("officer_roster_id"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    assignedById: text("assigned_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("officer_assignments_local_position_idx").on(t.unionId, t.localId, t.position),
    index("officer_assignments_user_active_idx").on(t.userId, t.revokedAt, t.endsAt),
  ],
);

export const authorityDelegations = pgTable(
  "authority_delegations",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "cascade" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "cascade" }),
    capability: text("capability").notNull(),
    grantorUserId: text("grantor_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    delegateUserId: text("delegate_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason").notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedById: text("revoked_by_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("authority_delegations_delegate_active_idx").on(t.delegateUserId, t.revokedAt, t.endsAt),
    index("authority_delegations_scope_idx").on(t.unionId, t.localId, t.capability),
  ],
);

export const committeeMemberships = pgTable(
  "committee_memberships",
  {
    id: text("id").primaryKey(),
    committeeId: text("committee_id").notNull(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "cascade" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("committee_memberships_committee_user_uidx").on(t.committeeId, t.userId),
    index("committee_memberships_user_idx").on(t.unionId, t.userId),
    foreignKey({
      name: "committee_memberships_committee_scope_fk",
      columns: [t.committeeId, t.unionId, t.localId],
      foreignColumns: [committees.id, committees.unionId, committees.localId],
    }).onDelete("cascade"),
  ],
);

export const breakGlassGrants = pgTable(
  "break_glass_grants",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "cascade" }),
    localId: text("local_id").notNull().references(() => locals.id, { onDelete: "cascade" }),
    grievanceId: text("grievance_id").notNull(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("break_glass_grants_resource_idx").on(t.grievanceId, t.userId, t.expiresAt)],
);
