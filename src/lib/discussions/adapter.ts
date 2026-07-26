import type {
  CreateDiscussionPostInput,
  CreateDiscussionThreadInput,
  DiscussionListFilters,
  DiscussionPost,
  DiscussionThread,
  DiscussionThreadWithPosts,
} from "@/types/discussions";
import type { HubReactionKind } from "@/types/hub-social";

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
      mentionedUserIds?: string[];
    },
  ): Promise<DiscussionThread>;
  listPosts(threadId: string): Promise<DiscussionPost[]>;
  getPost(postId: string): Promise<DiscussionPost | null>;
  createPost(
    threadId: string,
    input: CreateDiscussionPostInput,
    meta: {
      unionId: string;
      localId: string;
      authorId: string;
      authorName: string;
      mentionedUserIds?: string[];
    },
  ): Promise<DiscussionPost | null>;
  togglePostReaction(
    postId: string,
    kind: HubReactionKind,
    userId: string,
  ): Promise<DiscussionPost | null>;
}
