import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";
import type { MeetingRecurrence } from "@/types/meetings";

/** Calendar & Meetings Phase A — one recurring schedule per local, no auto-email. */
export const localMeetingSchedules = pgTable(
  "local_meeting_schedules",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "cascade" }),
    recurrence: text("recurrence").notNull().$type<MeetingRecurrence>(),
    dayOfMonth: integer("day_of_month"),
    weekday: integer("weekday"),
    nthWeekOfMonth: integer("nth_week_of_month"),
    customDates: jsonb("custom_dates").$type<string[]>(),
    time: text("time").notNull(),
    durationMinutes: integer("duration_minutes").notNull().default(90),
    location: text("location").notNull(),
    publicBlurb: text("public_blurb"),
    timezone: text("timezone").notNull(),
    publicSlug: text("public_slug").notNull(),
    updatedById: text("updated_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("local_meeting_schedules_local_idx").on(
      t.unionId,
      t.localId,
    ),
    uniqueIndex("local_meeting_schedules_slug_idx").on(t.publicSlug),
  ],
);
