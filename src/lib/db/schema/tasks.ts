import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { bargainingUnits, locals, unions } from "./tenant";

export const tasks = pgTable(
  "tasks",
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
    title: text("title").notNull(),
    assigneeId: text("assignee_id").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: text("status").notNull().default("open"),
    relatedGrievanceId: text("related_grievance_id"),
    relatedBumpingCaseId: text("related_bumping_case_id"),
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tasks_union_local_idx").on(t.unionId, t.localId),
    index("tasks_assignee_idx").on(t.assigneeId),
    index("tasks_status_idx").on(t.status),
    index("tasks_grievance_idx").on(t.relatedGrievanceId),
    index("tasks_bumping_idx").on(t.relatedBumpingCaseId),
  ],
);
