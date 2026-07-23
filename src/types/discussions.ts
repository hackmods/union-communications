/** Threaded local discussions (FEAT-002) — standalone or linked to a case. */

export interface DiscussionThread {
  id: string;
  unionId: string;
  localId: string;
  bargainingUnitId?: string;
  title: string;
  body: string;
  /** Optional link to a grievance (inherits grievance ACL). */
  grievanceId?: string;
  /** Optional link to a bumping case (inherits bumping ACL). */
  bumpingCaseId?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  /** Denormalized for list sorting / previews. */
  lastPostAt: string;
  postCount: number;
}

export interface DiscussionPost {
  id: string;
  threadId: string;
  unionId: string;
  localId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface DiscussionThreadWithPosts {
  thread: DiscussionThread;
  posts: DiscussionPost[];
}

export interface DiscussionListFilters {
  unionId: string;
  localId?: string;
  bargainingUnitId?: string;
  grievanceId?: string;
  bumpingCaseId?: string;
}

export interface CreateDiscussionThreadInput {
  title: string;
  body: string;
  bargainingUnitId?: string;
  grievanceId?: string;
  bumpingCaseId?: string;
}

export interface CreateDiscussionPostInput {
  body: string;
}
