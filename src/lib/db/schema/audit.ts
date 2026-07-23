import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    unionId: text("union_id").references(() => unions.id, {
      onDelete: "set null",
    }),
    localId: text("local_id").references(() => locals.id, {
      onDelete: "set null",
    }),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_log_union_idx").on(t.unionId),
    index("audit_log_resource_idx").on(t.resourceType, t.resourceId),
  ],
);
