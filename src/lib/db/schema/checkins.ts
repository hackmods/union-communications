import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { bargainingUnits, locals, unions } from "./tenant";

export const checkinSchedules = pgTable(
  "checkin_schedules",
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
    question: text("question").notNull(),
    cadence: text("cadence").notNull(),
    weekday: integer("weekday"),
    active: boolean("active").notNull().default(true),
    createdById: text("created_by_id").notNull(),
    createdByName: text("created_by_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("checkin_schedules_union_local_idx").on(t.unionId, t.localId),
    index("checkin_schedules_active_idx").on(t.active),
  ],
);

export const checkinAnswers = pgTable(
  "checkin_answers",
  {
    id: text("id").primaryKey(),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => checkinSchedules.id, { onDelete: "cascade" }),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    periodKey: text("period_key").notNull(),
    authorId: text("author_id").notNull(),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("checkin_answers_unique_author_period_idx").on(
      t.scheduleId,
      t.periodKey,
      t.authorId,
    ),
    index("checkin_answers_schedule_period_idx").on(t.scheduleId, t.periodKey),
    index("checkin_answers_union_local_idx").on(t.unionId, t.localId),
  ],
);
