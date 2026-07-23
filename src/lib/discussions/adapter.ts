import type {
  CreateDiscussionPostInput,
  CreateDiscussionThreadInput,
  DiscussionListFilters,
  DiscussionPost,
  DiscussionThread,
  DiscussionThreadWithPosts,
} from "@/types/discussions";

export interface DiscussionsAdapter {
  listThreads(filters: DiscussionListFilters): Promise<DiscussionThread[]>;
  getThread(id: string): Promise<DiscussionThread | null>;
  getThreadWithPosts(id: string): Promise<DiscussionThreadWithPosts | null>;
  createThread(
    input: CreateDiscussionThreadInput,
    meta: {
      unionId: string;
      localId: string;
      createdById: string;
      createdByName: string;
    },
  ): Promise<DiscussionThread>;
  listPosts(threadId: string): Promise<DiscussionPost[]>;
  createPost(
    threadId: string,
    input: CreateDiscussionPostInput,
    meta: {
      unionId: string;
      localId: string;
      authorId: string;
      authorName: string;
    },
  ): Promise<DiscussionPost | null>;
}
