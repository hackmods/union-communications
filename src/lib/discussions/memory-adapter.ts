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

const now = () => new Date().toISOString();

const threads: DiscussionThread[] = [
  {
    id: "disc-thread-001",
    unionId: "union-opseu",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    title: "Local business — next membership meeting prep",
    body: "Thread for officers to coordinate agenda items ahead of the next local meeting. Keep member PII out of posts.",
    createdById: "user-president-243",
    createdByName: "Local 243 President",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lastPostAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    postCount: 2,
  },
  {
    id: "disc-thread-002",
    unionId: "union-opseu",
    localId: "local-243",
    bargainingUnitId: "bu-243-ft",
    title: "Grievance grev-001 — Step 1 strategy",
    body: "Internal discussion linked to Member A grievance. Visible only to officers who can view that grievance.",
    grievanceId: "grev-001",
    createdById: "user-steward-243",
    createdByName: "Local 243 Steward",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    lastPostAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    postCount: 1,
  },
];

const posts: DiscussionPost[] = [
  {
    id: "disc-post-001",
    threadId: "disc-thread-001",
    unionId: "union-opseu",
    localId: "local-243",
    authorId: "user-president-243",
    authorName: "Local 243 President",
    body: "Please add any standing items by Friday. Treasurer update and grievance overview are already on the draft.",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "disc-post-002",
    threadId: "disc-thread-001",
    unionId: "union-opseu",
    localId: "local-243",
    authorId: "user-steward-243",
    authorName: "Local 243 Steward",
    body: "Can we slot 10 minutes for duty-bank clarification? Members have been asking at the board.",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "disc-post-003",
    threadId: "disc-thread-002",
    unionId: "union-opseu",
    localId: "local-243",
    authorId: "user-steward-243",
    authorName: "Local 243 Steward",
    body: "Management response is overdue — drafting escalation checklist next.",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
];

export class MemoryDiscussionsAdapter implements DiscussionsAdapter {
  async listThreads(
    filters: DiscussionListFilters,
  ): Promise<DiscussionThread[]> {
    let results = threads.filter((t) => t.unionId === filters.unionId);
    if (filters.localId) {
      results = results.filter((t) => t.localId === filters.localId);
    }
    if (filters.bargainingUnitId) {
      results = results.filter(
        (t) => t.bargainingUnitId === filters.bargainingUnitId,
      );
    }
    if (filters.grievanceId) {
      results = results.filter((t) => t.grievanceId === filters.grievanceId);
    }
    if (filters.bumpingCaseId) {
      results = results.filter(
        (t) => t.bumpingCaseId === filters.bumpingCaseId,
      );
    }
    return results.sort(
      (a, b) =>
        new Date(b.lastPostAt).getTime() - new Date(a.lastPostAt).getTime(),
    );
  }

  async getThread(id: string): Promise<DiscussionThread | null> {
    return threads.find((t) => t.id === id) ?? null;
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
    const ts = now();
    const thread: DiscussionThread = {
      id: newId("disc-thread"),
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
    };
    threads.push(thread);
    posts.push({
      id: newId("disc-post"),
      threadId: thread.id,
      unionId: meta.unionId,
      localId: meta.localId,
      authorId: meta.createdById,
      authorName: meta.createdByName,
      body: input.body,
      createdAt: ts,
    });
    return thread;
  }

  async listPosts(threadId: string): Promise<DiscussionPost[]> {
    return posts
      .filter((p) => p.threadId === threadId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
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
    const thread = await this.getThread(threadId);
    if (!thread) return null;
    const ts = now();
    const post: DiscussionPost = {
      id: newId("disc-post"),
      threadId,
      unionId: meta.unionId,
      localId: meta.localId,
      authorId: meta.authorId,
      authorName: meta.authorName,
      body: input.body,
      createdAt: ts,
    };
    posts.push(post);
    thread.lastPostAt = ts;
    thread.updatedAt = ts;
    thread.postCount += 1;
    return post;
  }
}

export const memoryDiscussionsStore = new MemoryDiscussionsAdapter();

/** @internal test helper */
export function resetMemoryDiscussions(): void {
  threads.length = 2;
  posts.length = 3;
}
