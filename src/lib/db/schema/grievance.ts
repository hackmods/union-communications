import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { bargainingUnits, locals, unions, users } from "./tenant";
import type {
  GrievanceIntake,
  GrievanceLinkedSnippet,
  GrievanceType,
  GrievanceWorkflowStage,
} from "@/types/grievance";

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
    memberUserId: text("member_user_id").references(() => users.id, { onDelete: "set null" }),
    privacyMode: text("privacy_mode").notNull().default("standard").$type<"standard" | "restricted">(),
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
    /** Existing rows backfilled to `formal`; new creates default to intake in adapters. */
    workflowStage: text("workflow_stage")
      .notNull()
      .default("formal")
      .$type<GrievanceWorkflowStage>(),
    fileNumber: text("file_number"),
    grievanceType: text("grievance_type").$type<GrievanceType>(),
    memberNames: jsonb("member_names").$type<string[]>(),
    summary: text("summary"),
    intake: jsonb("intake").$type<GrievanceIntake>(),
    linkedSnippets: jsonb("linked_snippets").$type<GrievanceLinkedSnippet[]>(),
    localLabel: text("local_label"),
    unitLabel: text("unit_label"),
  },
  (t) => [
    index("grievances_union_local_idx").on(t.unionId, t.localId),
    index("grievances_steward_idx").on(t.assignedStewardId),
    uniqueIndex("grievances_union_local_file_number_uidx").on(
      t.unionId,
      t.localId,
      t.fileNumber,
    ),
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
  mediatorName: text("mediator_name"),
  hearingDate: timestamp("hearing_date", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
  recordedById: text("recorded_by_id").notNull(),
  sentToArbitration: boolean("sent_to_arbitration").notNull().default(false),
  sentToArbitrationAt: timestamp("sent_to_arbitration_at", { withTimezone: true }),
});
