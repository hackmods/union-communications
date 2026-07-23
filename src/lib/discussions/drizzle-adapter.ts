import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { discussionPosts, discussionThreads } from "@/lib/db/schema";
import type { DiscussionsAdapter } from "./adapter";
import type {
  CreateDiscussionPostInput,
  CreateDiscussionThreadInput,
  DiscussionListFilters,
  DiscussionPost,
  DiscussionThread,
  DiscussionThreadWithPosts,
} from "@/types/discussions";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapThread(row: typeof discussionThreads.$inferSelect): DiscussionThread {
  return {
    id: row.id,
    unionId: row.unionId,
    localId: row.localId,
    bargainingUnitId: row.bargainingUnitId ?? undefined,
    title: row.title,
    body: row.body,
    grievanceId: row.grievanceId ?? undefined,
    bumpingCaseId: row.bumpingCaseId ?? undefined,
    createdById: row.createdById,
    createdByName: row.createdByName,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
    lastPostAt: toIso(row.lastPostAt)!,
    postCount: row.postCount,
  };
}

function mapPost(row: typeof discussionPosts.$inferSelect): DiscussionPost {
  return {
    id: row.id,
    threadId: row.threadId,
    unionId: row.unionId,
    localId: row.localId,
    authorId: row.authorId,
    authorName: row.authorName,
    body: row.body,
    createdAt: toIso(row.createdAt)!,
  };
}

export class DrizzleDiscussionsAdapter implements DiscussionsAdapter {
  async listThreads(
    filters: DiscussionListFilters,
  ): Promise<DiscussionThread[]> {
    const db = getDb();
    const conditions = [eq(discussionThreads.unionId, filters.unionId)];
    if (filters.localId) {
      conditions.push(eq(discussionThreads.localId, filters.localId));
    }
    if (filters.bargainingUnitId) {
      conditions.push(
        eq(discussionThreads.bargainingUnitId, filters.bargainingUnitId),
      );
    }
    if (filters.grievanceId) {
      conditions.push(eq(discussionThreads.grievanceId, filters.grievanceId));
    }
    if (filters.bumpingCaseId) {
      conditions.push(
        eq(discussionThreads.bumpingCaseId, filters.bumpingCaseId),
      );
    }
    const rows = await db
      .select()
      .from(discussionThreads)
      .where(and(...conditions))
      .orderBy(desc(discussionThreads.lastPostAt));
    return rows.map(mapThread);
  }

  async getThread(id: string): Promise<DiscussionThread | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(discussionThreads)
      .where(eq(discussionThreads.id, id))
      .limit(1);
    return rows[0] ? mapThread(rows[0]) : null;
  }

  async getThreadWithPosts(
    id: string,
  ): Promise<DiscussionThreadWithPosts | null> {
    const thread = await this.getThread(id);
    if (!thread) return null;
    const threadPosts = await this.listPosts(id);
    return { thread, posts: threadPosts };
  }

  async createThread(
    input: CreateDiscussionThreadInput,
    meta: {
      unionId: string;
      localId: string;
      createdById: string;
      createdByName: string;
    },
  ): Promise<DiscussionThread> {
    const db = getDb();
    const id = newId("disc-thread");
    const postId = newId("disc-post");
    const ts = new Date();
    await db.insert(discussionThreads).values({
      id,
      unionId: meta.unionId,
      localId: meta.localId,
      bargainingUnitId: input.bargainingUnitId,
      title: input.title,
      body: input.body,
      grievanceId: input.grievanceId,
      bumpingCaseId: input.bumpingCaseId,
      createdById: meta.createdById,
      createdByName: meta.createdByName,
      createdAt: ts,
      updatedAt: ts,
      lastPostAt: ts,
      postCount: 1,
    });
    await db.insert(discussionPosts).values({
      id: postId,
      threadId: id,
      unionId: meta.unionId,
      localId: meta.localId,
      authorId: meta.createdById,
      authorName: meta.createdByName,
      body: input.body,
      createdAt: ts,
    });
    const thread = await this.getThread(id);
    if (!thread) throw new Error("Failed to create discussion thread");
    return thread;
  }

  async listPosts(threadId: string): Promise<DiscussionPost[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(discussionPosts)
      .where(eq(discussionPosts.threadId, threadId))
      .orderBy(asc(discussionPosts.createdAt));
    return rows.map(mapPost);
  }

  async createPost(
    threadId: string,
    input: CreateDiscussionPostInput,
    meta: {
      unionId: string;
      localId: string;
      authorId: string;
      authorName: string;
    },
  ): Promise<DiscussionPost | null> {
    const db = getDb();
    const thread = await this.getThread(threadId);
    if (!thread) return null;
    const id = newId("disc-post");
    const ts = new Date();
    await db.insert(discussionPosts).values({
      id,
      threadId,
      unionId: meta.unionId,
      localId: meta.localId,
      authorId: meta.authorId,
      authorName: meta.authorName,
      body: input.body,
      createdAt: ts,
    });
    await db
      .update(discussionThreads)
      .set({
        lastPostAt: ts,
        updatedAt: ts,
        postCount: thread.postCount + 1,
      })
      .where(eq(discussionThreads.id, threadId));
    const rows = await db
      .select()
      .from(discussionPosts)
      .where(eq(discussionPosts.id, id))
      .limit(1);
    return rows[0] ? mapPost(rows[0]) : null;
  }
}
