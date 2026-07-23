import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { grievances } from "./grievance";
import { locals, unions } from "./tenant";

export const memberCommunications = pgTable(
  "member_communications",
  {
    id: text("id").primaryKey(),
    grievanceId: text("grievance_id")
      .notNull()
      .references(() => grievances.id, { onDelete: "cascade" }),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    channel: text("channel").notNull(),
    direction: text("direction").notNull(),
    summary: text("summary").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    loggedById: text("logged_by_id").notNull(),
    loggedByName: text("logged_by_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("member_comms_grievance_idx").on(t.grievanceId)],
);

export const scheduledMeetings = pgTable(
  "scheduled_meetings",
  {
    id: text("id").primaryKey(),
    grievanceId: text("grievance_id")
      .notNull()
      .references(() => grievances.id, { onDelete: "cascade" }),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    location: text("location"),
    description: text("description"),
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("scheduled_meetings_grievance_idx").on(t.grievanceId)],
);
