import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { bargainingUnits, locals, unions } from "./tenant";

export const discussionThreads = pgTable(
  "discussion_threads",
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
    title: text("title").notNull(),
    body: text("body").notNull(),
    grievanceId: text("grievance_id"),
    bumpingCaseId: text("bumping_case_id"),
    createdById: text("created_by_id").notNull(),
    createdByName: text("created_by_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastPostAt: timestamp("last_post_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    postCount: integer("post_count").notNull().default(1),
  },
  (t) => [
    index("discussion_threads_union_local_idx").on(t.unionId, t.localId),
    index("discussion_threads_last_post_idx").on(t.lastPostAt),
    index("discussion_threads_grievance_idx").on(t.grievanceId),
    index("discussion_threads_bumping_idx").on(t.bumpingCaseId),
  ],
);

export const discussionPosts = pgTable(
  "discussion_posts",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => discussionThreads.id, { onDelete: "cascade" }),
    unionId: text("union_id")
      .notNull()
      .references(() => unions.id, { onDelete: "restrict" }),
    localId: text("local_id")
      .notNull()
      .references(() => locals.id, { onDelete: "restrict" }),
    authorId: text("author_id").notNull(),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("discussion_posts_thread_idx").on(t.threadId),
    index("discussion_posts_union_local_idx").on(t.unionId, t.localId),
  ],
);
