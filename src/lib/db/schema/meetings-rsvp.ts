import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";
import type {
  RsvpAttending,
  RsvpJoinMode,
  RsvpSource,
} from "@/types/meetings";

/** Calendar R1 — one-off union/local meeting event (not grievance ScheduledMeeting). */
export const unionMeetings = pgTable(
  "union_meetings",
  {
    id: text("id").primaryKey(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "cascade" }),
    bargainingUnitId: text("bargaining_unit_id"),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    location: text("location").notNull(),
    publicBlurb: text("public_blurb"),
    quorumNeeded: integer("quorum_needed"),
    hybrid: text("hybrid").notNull(),
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("union_meetings_union_local_idx").on(t.unionId, t.localId),
    index("union_meetings_starts_at_idx").on(t.startsAt),
  ],
);

/** Calendar R1 — opaque public RSVP share tokens. */
export const rsvpTokens = pgTable(
  "rsvp_tokens",
  {
    id: text("id").primaryKey(),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => unionMeetings.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdById: text("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("rsvp_tokens_token_idx").on(t.token),
    index("rsvp_tokens_meeting_idx").on(t.meetingId),
  ],
);

/** Calendar R1 — RSVP responses (public form + officer walk-in). */
export const rsvpResponses = pgTable(
  "rsvp_responses",
  {
    id: text("id").primaryKey(),
    meetingId: text("meeting_id")
      .notNull()
      .references(() => unionMeetings.id, { onDelete: "cascade" }),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "cascade" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "cascade" }),
    attending: text("attending").notNull().$type<RsvpAttending>(),
    joinMode: text("join_mode").$type<RsvpJoinMode>(),
    displayName: text("display_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    guestsOnSite: integer("guests_on_site"),
    dietaryNote: text("dietary_note"),
    accessibilityNote: text("accessibility_note"),
    roleOrOffice: text("role_or_office"),
    source: text("source").notNull().$type<RsvpSource>(),
    consentAcceptedAt: timestamp("consent_accepted_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipHash: text("ip_hash"),
  },
  (t) => [
    index("rsvp_responses_meeting_idx").on(t.meetingId),
    index("rsvp_responses_union_local_idx").on(t.unionId, t.localId),
  ],
);
