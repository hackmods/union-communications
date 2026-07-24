import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";
import type { MeetingType, MinutesStatus, Motion } from "@/types/minutes";

export const meetingMinutes = pgTable(
  "meeting_minutes",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    meetingDate: timestamp("meeting_date", { withTimezone: true }).notNull(),
    meetingType: text("meeting_type").notNull().$type<MeetingType>(),
    attendees: jsonb("attendees").notNull().$type<string[]>(),
    motions: jsonb("motions").notNull().$type<Motion[]>(),
    notes: text("notes").notNull(),
    recordedById: text("recorded_by_id").notNull(),
    recordedByName: text("recorded_by_name").notNull(),
    status: text("status").notNull().$type<MinutesStatus>(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("meeting_minutes_union_local_idx").on(t.unionId, t.localId),
    index("meeting_minutes_date_idx").on(t.meetingDate),
    index("meeting_minutes_status_idx").on(t.status),
  ],
);
