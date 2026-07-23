import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";
import type { ChecklistState, PositionDescription } from "@/types/bumping";

export const bumpingCases = pgTable(
  "bumping_cases",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    memberRef: text("member_ref").notNull(),
    /** Stored as ISO date string to match existing domain types. */
    seniorityDate: text("seniority_date").notNull(),
    currentPosition: text("current_position").notNull(),
    targetPosition: text("target_position").notNull(),
    scenario: text("scenario").notNull(),
    status: text("status").notNull(),
    incumbentPosition: jsonb("incumbent_position")
      .notNull()
      .$type<PositionDescription>(),
    bumpingPosition: jsonb("bumping_position")
      .notNull()
      .$type<PositionDescription>(),
    checklist: jsonb("checklist").notNull().$type<ChecklistState>(),
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("bumping_cases_union_local_idx").on(t.unionId, t.localId)],
);

export const committeeSessions = pgTable("committee_sessions", {
  id: text("id").primaryKey(),
  bumpingCaseId: text("bumping_case_id")
    .notNull()
    .references(() => bumpingCases.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  attendees: jsonb("attendees").notNull().$type<string[]>(),
  agenda: text("agenda").notNull(),
  createdById: text("created_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const committeeNotes = pgTable("committee_notes", {
  id: text("id").primaryKey(),
  bumpingCaseId: text("bumping_case_id")
    .notNull()
    .references(() => bumpingCases.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => committeeSessions.id, {
    onDelete: "set null",
  }),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const decisionRecords = pgTable("decision_records", {
  id: text("id").primaryKey(),
  bumpingCaseId: text("bumping_case_id")
    .notNull()
    .unique()
    .references(() => bumpingCases.id, { onDelete: "cascade" }),
  outcome: text("outcome").notNull(),
  rationale: text("rationale").notNull(),
  dissentNotes: text("dissent_notes"),
  recordedById: text("recorded_by_id").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const memberSeniorityRecords = pgTable("member_seniority_records", {
  id: text("id").primaryKey(),
  unionId: text("union_id")
    .notNull()
    .references(() => unions.id, { onDelete: "restrict" }),
  localId: text("local_id")
    .notNull()
    .references(() => locals.id, { onDelete: "restrict" }),
  memberRef: text("member_ref").notNull(),
  seniorityDate: text("seniority_date").notNull(),
  classification: text("classification").notNull(),
  active: boolean("active").notNull().default(true),
});
