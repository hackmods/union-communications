import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type MembershipPolicy = "multi_local" | "single_local";

export const unions = pgTable("unions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  defaultLocale: text("default_locale").notNull().default("en"),
  enabledModules: jsonb("enabled_modules").notNull().$type<string[]>(),
  /**
   * multi_local (default): many active locals per user in this union.
   * single_local: at most one active local_memberships row per user.
   */
  membershipPolicy: text("membership_policy")
    .notNull()
    .$type<MembershipPolicy>()
    .default("multi_local"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedById: text("archived_by_id"),
  /**
   * Demo-shape flag — set by the 0001 data migration. Lets platform operators
   * surface the demo roster / reference tenant in `/app/site-admin/demo-cleanup`
   * without relying on fragile regexes. Idempotent; never flipped back to false.
   */
  isDemo: boolean("is_demo").notNull().default(false),
});

export const divisions = pgTable("divisions", {
  id: text("id").primaryKey(),
  unionId: text("union_id")
    .notNull()
    .references(() => unions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  enabledModules: jsonb("enabled_modules").notNull().$type<string[]>(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedById: text("archived_by_id"),
  isDemo: boolean("is_demo").notNull().default(false),
});

export const locals = pgTable(
  "locals",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    divisionId: text("division_id").references(() => divisions.id, {
      onDelete: "set null",
    }),
    localNumber: text("local_number").notNull(),
    subText: text("sub_text").notNull().default(""),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedById: text("archived_by_id"),
    isDemo: boolean("is_demo").notNull().default(false),
  },
  (t) => [
    uniqueIndex("locals_union_number_active_uidx")
      .on(t.unionId, t.localNumber)
      .where(sql`${t.archivedAt} IS NULL`),
  ],
);

export const bargainingUnits = pgTable("bargaining_units", {
  id: text("id").primaryKey(),
  unionId: text("union_id")
    .notNull()
    .references(() => unions.id, { onDelete: "cascade" }),
  localId: text("local_id")
    .notNull()
    .references(() => locals.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  grievanceConfig: jsonb("grievance_config").$type<{
    steps: { number: number; name: string; responseDays: number | null }[];
  }>(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  unionId: text("union_id").references(() => unions.id, {
    onDelete: "set null",
  }),
  divisionId: text("division_id").references(() => divisions.id, {
    onDelete: "set null",
  }),
  localId: text("local_id").references(() => locals.id, {
    onDelete: "set null",
  }),
  bargainingUnitId: text("bargaining_unit_id").references(
    () => bargainingUnits.id,
    { onDelete: "set null" },
  ),
  accessibleLocalIds: jsonb("accessible_local_ids").$type<string[]>(),
  roles: jsonb("roles").notNull().$type<string[]>(),
  totpSecret: text("totp_secret"),
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  /**
   * Bumps on `signout-everywhere` and email change. Reserved for v2
   * server-side session invalidation (the JWT callback will reject tokens
   * whose `sessionVersion` lag). JWT refresh syncs tenancy when version or union/local drift.
   * `0` is the genesis value.
   */
  sessionVersion: integer("session_version").notNull().default(0),
  /** Optional profile photo as a data URL (JPEG/PNG/WebP). */
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedById: text("archived_by_id"),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedReason: text("locked_reason"),
  lockedById: text("locked_by_id"),
  isDemo: boolean("is_demo").notNull().default(false),
});
