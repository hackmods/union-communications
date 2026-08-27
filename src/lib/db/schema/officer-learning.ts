import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";

export const officerLearningUsers = pgTable(
  "officer_learning_users",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    hubSyncEnabled: boolean("hub_sync_enabled").notNull().default(false),
    shareWithLocal: boolean("share_with_local").notNull().default(false),
    modules: jsonb("modules").notNull().$type<Record<string, unknown>>(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("officer_learning_users_union_user_idx").on(t.unionId, t.userId),
    index("officer_learning_users_union_local_idx").on(t.unionId, t.localId),
  ],
);

export const officerLearningLocalSettings = pgTable(
  "officer_learning_local_settings",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    reportingEnabled: boolean("reporting_enabled").notNull().default(false),
    updatedById: text("updated_by_id").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("officer_learning_local_settings_union_local_idx").on(
      t.unionId,
      t.localId,
    ),
  ],
);
