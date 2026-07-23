import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { bargainingUnits, locals, unions } from "./tenant";

export const grievances = pgTable(
  "grievances",
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
    category: text("category").notNull(),
    status: text("status").notNull(),
    currentStep: integer("current_step").notNull().default(1),
    filedAt: timestamp("filed_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    assignedStewardId: text("assigned_steward_id").notNull(),
    createdById: text("created_by_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("grievances_union_local_idx").on(t.unionId, t.localId),
    index("grievances_steward_idx").on(t.assignedStewardId),
  ],
);

export const grievanceEvents = pgTable("grievance_events", {
  id: text("id").primaryKey(),
  grievanceId: text("grievance_id")
    .notNull()
    .references(() => grievances.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  stepNumber: integer("step_number"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const grievanceNotes = pgTable("grievance_notes", {
  id: text("id").primaryKey(),
  grievanceId: text("grievance_id")
    .notNull()
    .references(() => grievances.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Optional 1:1 arbitration / settlement outcome (FEAT-004). */
export const grievanceOutcomes = pgTable("grievance_outcomes", {
  id: text("id").primaryKey(),
  grievanceId: text("grievance_id")
    .notNull()
    .unique()
    .references(() => grievances.id, { onDelete: "cascade" }),
  outcomeType: text("outcome_type").notNull(),
  remedy: text("remedy"),
  settlementTerms: text("settlement_terms"),
  arbitratorName: text("arbitrator_name"),
  hearingDate: timestamp("hearing_date", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
  recordedById: text("recorded_by_id").notNull(),
});
