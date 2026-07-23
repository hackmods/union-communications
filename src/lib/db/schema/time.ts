import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";
import type {
  GeofenceMode,
  TimeCategory,
  TimeEntryGps,
  TimeEntrySource,
  TimeEntryStatus,
} from "@/types/time";

export const timeEntries = pgTable(
  "time_entries",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    workerId: text("worker_id").notNull(),
    workerName: text("worker_name").notNull(),
    category: text("category").notNull().$type<TimeCategory>(),
    jobCodeId: text("job_code_id").notNull(),
    jobCodeLabel: text("job_code_label").notNull(),
    status: text("status").notNull().$type<TimeEntryStatus>(),
    entrySource: text("entry_source").notNull().$type<TimeEntrySource>(),
    clockInAt: timestamp("clock_in_at", { withTimezone: true }).notNull(),
    clockOutAt: timestamp("clock_out_at", { withTimezone: true }),
    notes: text("notes"),
    eventId: text("event_id"),
    eventLabel: text("event_label"),
    clockInGps: jsonb("clock_in_gps").$type<TimeEntryGps>(),
    clockOutGps: jsonb("clock_out_gps").$type<TimeEntryGps>(),
    geofenceResult: text("geofence_result"),
    approvedById: text("approved_by_id"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("time_entries_union_local_idx").on(t.unionId, t.localId),
    index("time_entries_worker_idx").on(t.workerId),
  ],
);

export const jobCodes = pgTable(
  "job_codes",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    label: text("label").notNull(),
    category: text("category").notNull().$type<TimeCategory>(),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("job_codes_union_local_idx").on(t.unionId, t.localId)],
);

export const workSites = pgTable("work_sites", {
  id: text("id").primaryKey(),
  unionId: text("union_id")
    .notNull()
    .references(() => unions.id, { onDelete: "restrict" }),
  localId: text("local_id")
    .notNull()
    .references(() => locals.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  geofenceRadiusM: integer("geofence_radius_m").notNull(),
  geofenceMode: text("geofence_mode").notNull().$type<GeofenceMode>(),
  active: boolean("active").notNull().default(true),
});

export const timeWorkers = pgTable(
  "time_workers",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    userId: text("user_id"),
    trackGaps: boolean("track_gaps").notNull().default(false),
    active: boolean("active").notNull().default(true),
  },
  (t) => [index("time_workers_union_local_idx").on(t.unionId, t.localId)],
);

export const timeExpectedWindows = pgTable(
  "time_expected_windows",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    label: text("label").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    category: text("category").notNull().$type<TimeCategory>(),
    jobCodeId: text("job_code_id"),
    attendeeWorkerIds: jsonb("attendee_worker_ids").notNull().$type<string[]>(),
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("time_expected_windows_union_local_idx").on(t.unionId, t.localId),
  ],
);
