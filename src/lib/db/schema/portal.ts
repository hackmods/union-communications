import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { locals, unions } from "./tenant";

export const portalCircles = pgTable("portal_circles", {
  id: text("id").primaryKey(), unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "cascade" }),
  localId: text("local_id").references(() => locals.id, { onDelete: "cascade" }), kind: text("kind").notNull(), name: text("name").notNull(),
  description: text("description"), visibility: text("visibility").notNull(), frontStartsAt: timestamp("front_starts_at", { withTimezone: true }),
  frontEndsAt: timestamp("front_ends_at", { withTimezone: true }), archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdById: text("created_by_id").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (t) => [index("portal_circles_union_local_idx").on(t.unionId, t.localId)]);

export const portalCircleMemberships = pgTable("portal_circle_memberships", {
  id: text("id").primaryKey(), circleId: text("circle_id").notNull().references(() => portalCircles.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(), userName: text("user_name").notNull(), role: text("role").notNull(), muted: boolean("muted").notNull().default(false),
  mutedTools: jsonb("muted_tools").notNull().$type<string[]>().default([]), starred: boolean("starred").notNull().default(false), joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
}, (t) => [uniqueIndex("portal_circle_memberships_circle_user_uidx").on(t.circleId, t.userId), index("portal_circle_memberships_user_idx").on(t.userId)]);

export const portalBulletinPosts = pgTable("portal_bulletin_posts", {
  id: text("id").primaryKey(), circleId: text("circle_id").notNull().references(() => portalCircles.id, { onDelete: "cascade" }), unionId: text("union_id").notNull(),
  authorId: text("author_id").notNull(), authorName: text("author_name").notNull(), title: text("title").notNull(), body: text("body").notNull(), pinned: boolean("pinned").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (t) => [index("portal_bulletin_posts_circle_idx").on(t.circleId, t.createdAt)]);
export const portalBulletinComments = pgTable("portal_bulletin_comments", {
  id: text("id").primaryKey(), postId: text("post_id").notNull().references(() => portalBulletinPosts.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull(), authorName: text("author_name").notNull(), body: text("body").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (t) => [index("portal_bulletin_comments_post_idx").on(t.postId, t.createdAt)]);

export const portalActions = pgTable("portal_actions", {
  id: text("id").primaryKey(), circleId: text("circle_id").notNull().references(() => portalCircles.id, { onDelete: "cascade" }), unionId: text("union_id").notNull(),
  listName: text("list_name").notNull(), title: text("title").notNull(), notes: text("notes"), assigneeId: text("assignee_id"), assigneeName: text("assignee_name"),
  dueAt: timestamp("due_at", { withTimezone: true }), completedAt: timestamp("completed_at", { withTimezone: true }), deletedAt: timestamp("deleted_at", { withTimezone: true }),
  sourceBulletinPostId: text("source_bulletin_post_id"), createdById: text("created_by_id").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (t) => [index("portal_actions_circle_idx").on(t.circleId, t.createdAt), index("portal_actions_assignee_idx").on(t.assigneeId)]);

export const portalCalendarEvents = pgTable("portal_calendar_events", {
  id: text("id").primaryKey(), circleId: text("circle_id").notNull().references(() => portalCircles.id, { onDelete: "cascade" }), unionId: text("union_id").notNull(),
  title: text("title").notNull(), description: text("description"), startsAt: timestamp("starts_at", { withTimezone: true }).notNull(), endsAt: timestamp("ends_at", { withTimezone: true }),
  location: text("location"), externalUrl: text("external_url"), createdById: text("created_by_id").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (t) => [index("portal_calendar_events_circle_idx").on(t.circleId, t.startsAt)]);

export const portalBinderItems = pgTable("portal_binder_items", {
  id: text("id").primaryKey(), circleId: text("circle_id").notNull().references(() => portalCircles.id, { onDelete: "cascade" }), unionId: text("union_id").notNull(),
  title: text("title").notNull(), folder: text("folder"), content: text("content").notNull(), contentType: text("content_type").notNull(), createdById: text("created_by_id").notNull(), createdByName: text("created_by_name").notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (t) => [index("portal_binder_items_circle_idx").on(t.circleId, t.createdAt)]);

export const portalFloorMessages = pgTable("portal_floor_messages", {
  id: text("id").primaryKey(), circleId: text("circle_id").notNull().references(() => portalCircles.id, { onDelete: "cascade" }), unionId: text("union_id").notNull(), authorId: text("author_id").notNull(), authorName: text("author_name").notNull(), body: text("body").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (t) => [index("portal_floor_messages_circle_idx").on(t.circleId, t.createdAt)]);

export const portalRollCallQuestions = pgTable("portal_roll_call_questions", {
  id: text("id").primaryKey(), circleId: text("circle_id").notNull().references(() => portalCircles.id, { onDelete: "cascade" }), unionId: text("union_id").notNull(), question: text("question").notNull(), cadence: text("cadence").notNull(), active: boolean("active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (t) => [index("portal_roll_call_questions_circle_idx").on(t.circleId, t.createdAt)]);
export const portalRollCallAnswers = pgTable("portal_roll_call_answers", {
  id: text("id").primaryKey(), questionId: text("question_id").notNull().references(() => portalRollCallQuestions.id, { onDelete: "cascade" }), circleId: text("circle_id").notNull().references(() => portalCircles.id, { onDelete: "cascade" }), authorId: text("author_id").notNull(), authorName: text("author_name").notNull(), body: text("body").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (t) => [index("portal_roll_call_answers_circle_idx").on(t.circleId, t.createdAt)]);

export const portalPipelineBoards = pgTable("portal_pipeline_boards", {
  id: text("id").primaryKey(), circleId: text("circle_id").notNull().references(() => portalCircles.id, { onDelete: "cascade" }), unionId: text("union_id").notNull(), name: text("name").notNull(),
}, (t) => [uniqueIndex("portal_pipeline_boards_circle_uidx").on(t.circleId)]);
export const portalPipelineColumns = pgTable("portal_pipeline_columns", {
  id: text("id").primaryKey(), boardId: text("board_id").notNull().references(() => portalPipelineBoards.id, { onDelete: "cascade" }), name: text("name").notNull(), position: integer("position").notNull(),
}, (t) => [index("portal_pipeline_columns_board_idx").on(t.boardId, t.position)]);
export const portalPipelineCards = pgTable("portal_pipeline_cards", {
  id: text("id").primaryKey(), boardId: text("board_id").notNull().references(() => portalPipelineBoards.id, { onDelete: "cascade" }), columnId: text("column_id").notNull().references(() => portalPipelineColumns.id, { onDelete: "cascade" }), title: text("title").notNull(), body: text("body"), position: integer("position").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (t) => [index("portal_pipeline_cards_column_idx").on(t.columnId, t.position)]);

export const portalDispatchItems = pgTable("portal_dispatch_items", {
  id: text("id").primaryKey(), unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "cascade" }), userId: text("user_id").notNull(), circleId: text("circle_id").notNull().references(() => portalCircles.id, { onDelete: "cascade" }), circleName: text("circle_name").notNull(), kind: text("kind").notNull(), title: text("title").notNull(), body: text("body"), readAt: timestamp("read_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (t) => [index("portal_dispatch_user_idx").on(t.unionId, t.userId, t.readAt, t.createdAt)]);

export const portalMomentumItems = pgTable("portal_momentum_items", {
  id: text("id").primaryKey(), circleId: text("circle_id").notNull().references(() => portalCircles.id, { onDelete: "cascade" }), unionId: text("union_id").notNull(), title: text("title").notNull(), notes: text("notes"), progress: integer("progress").notNull(), updatedById: text("updated_by_id").notNull(), updatedByName: text("updated_by_name").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (t) => [index("portal_momentum_circle_idx").on(t.circleId, t.updatedAt)]);

export const portalSidebarThreads = pgTable("portal_sidebar_threads", {
  id: text("id").primaryKey(), unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "cascade" }),
  participantPairKey: text("participant_pair_key").notNull(), createdById: text("created_by_id").notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (t) => [
  index("portal_sidebar_threads_union_idx").on(t.unionId, t.updatedAt),
  uniqueIndex("portal_sidebar_threads_pair_uidx").on(t.unionId, t.participantPairKey),
]);
export const portalSidebarParticipants = pgTable("portal_sidebar_participants", {
  id: text("id").primaryKey(), threadId: text("thread_id").notNull().references(() => portalSidebarThreads.id, { onDelete: "cascade" }), userId: text("user_id").notNull(), userName: text("user_name").notNull(), position: integer("position").notNull(),
}, (t) => [uniqueIndex("portal_sidebar_participants_thread_user_uidx").on(t.threadId, t.userId)]);
export const portalSidebarMessages = pgTable("portal_sidebar_messages", {
  id: text("id").primaryKey(), threadId: text("thread_id").notNull().references(() => portalSidebarThreads.id, { onDelete: "cascade" }), unionId: text("union_id").notNull(), authorId: text("author_id").notNull(), authorName: text("author_name").notNull(), body: text("body").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (t) => [index("portal_sidebar_messages_thread_idx").on(t.threadId, t.createdAt)]);
