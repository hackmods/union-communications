import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { bargainingUnits, locals, unions } from "./tenant";

export const informalLogEntries = pgTable(
  "informal_log_entries",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    bargainingUnitId: text("bargaining_unit_id").references(
      () => bargainingUnits.id,
      { onDelete: "set null" },
    ),
    memberPseudonym: text("member_pseudonym"),
    topic: text("topic").notNull(),
    channel: text("channel").notNull(),
    summary: text("summary").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    loggedById: text("logged_by_id").notNull(),
    loggedByName: text("logged_by_name").notNull(),
    convertedToGrievanceId: text("converted_to_grievance_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("informal_log_union_local_idx").on(t.unionId, t.localId),
    index("informal_log_occurred_idx").on(t.occurredAt),
    index("informal_log_converted_idx").on(t.convertedToGrievanceId),
  ],
);
