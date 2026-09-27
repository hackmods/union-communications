import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
    circleId: text("circle_id"),
    /**
     * Optional free-form operator metadata. Persisted as JSONB so callers
     * may read it back as a structured object; v1 stores `Record<string, string>`
     * per `AuditEntry.metadata`.
     */
    metadata: jsonb("metadata").$type<Record<string, string>>(),
    outcome: text("outcome")
      .notNull()
      .$type<"success" | "denied" | "error" | "unknown">()
      .default("success"),
    requestId: text("request_id"),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_log_union_idx").on(t.unionId),
    index("audit_log_resource_idx").on(t.resourceType, t.resourceId),
    index("audit_log_circle_idx").on(t.unionId, t.circleId, t.timestamp),
    index("audit_log_request_idx")
      .on(t.requestId)
      .where(sql`${t.requestId} is not null`),
  ],
);
