import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const unions = pgTable("unions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  defaultLocale: text("default_locale").notNull().default("en"),
  enabledModules: jsonb("enabled_modules").notNull().$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const divisions = pgTable("divisions", {
  id: text("id").primaryKey(),
  unionId: text("union_id")
    .notNull()
    .references(() => unions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  enabledModules: jsonb("enabled_modules").notNull().$type<string[]>(),
});

export const locals = pgTable("locals", {
  id: text("id").primaryKey(),
  unionId: text("union_id")
    .notNull()
    .references(() => unions.id, { onDelete: "cascade" }),
  divisionId: text("division_id").references(() => divisions.id, {
    onDelete: "set null",
  }),
  localNumber: text("local_number").notNull(),
  subText: text("sub_text").notNull().default(""),
});

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
    onDelete: "restrict",
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
