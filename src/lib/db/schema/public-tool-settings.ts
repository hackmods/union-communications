/**
 * Instance / union / local public Comms tool visibility.
 * Companion DDL: `0038_public_tool_settings.sql`.
 */
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";

export const platformPublicToolSettings = pgTable(
  "platform_public_tool_settings",
  {
    id: text("id").primaryKey(),
    disabledToolSlugs: jsonb("disabled_tool_slugs")
      .notNull()
      .$type<string[]>()
      .default([]),
    updatedById: text("updated_by_id").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const unionPublicToolSettings = pgTable(
  "union_public_tool_settings",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    disabledToolSlugs: jsonb("disabled_tool_slugs")
      .notNull()
      .$type<string[]>()
      .default([]),
    updatedById: text("updated_by_id").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("union_public_tool_settings_union_idx").on(t.unionId),
    index("union_public_tool_settings_union_id_idx").on(t.unionId),
  ],
);

export const localPublicToolSettings = pgTable(
  "local_public_tool_settings",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "cascade" }),
    disabledToolSlugs: jsonb("disabled_tool_slugs")
      .notNull()
      .$type<string[]>()
      .default([]),
    updatedById: text("updated_by_id").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("local_public_tool_settings_union_local_idx").on(
      t.unionId,
      t.localId,
    ),
    index("local_public_tool_settings_union_id_idx").on(t.unionId),
  ],
);
