import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";
import type { PollQuestion, PollStatus } from "@/types/polls";

/** FUTURE-006 — poll definitions. */
export const pollDefinitions = pgTable(
  "poll_definitions",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    intro: text("intro"),
    questions: jsonb("questions").notNull().$type<PollQuestion[]>(),
    createdById: text("created_by_id").notNull(),
    status: text("status").notNull().$type<PollStatus>(),
    consentRequired: text("consent_required").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("poll_definitions_slug_idx").on(t.slug),
    index("poll_definitions_union_local_idx").on(t.unionId, t.localId),
  ],
);

/** FUTURE-006 — anonymous poll responses (no raw IP). */
export const pollResponses = pgTable(
  "poll_responses",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => pollDefinitions.id, { onDelete: "cascade" }),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    answers: jsonb("answers").notNull().$type<Record<string, string>>(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    consentAcceptedAt: timestamp("consent_accepted_at", {
      withTimezone: true,
    }).notNull(),
    ipHash: text("ip_hash"),
  },
  (t) => [
    index("poll_responses_poll_idx").on(t.pollId),
    index("poll_responses_union_local_idx").on(t.unionId, t.localId),
  ],
);
