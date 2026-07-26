/** Shared Hub social primitives — discussions + tasks stretch (reactions, mentions). */

export const HUB_REACTION_KINDS = ["solidarity", "ack", "question"] as const;
export type HubReactionKind = (typeof HUB_REACTION_KINDS)[number];

export interface HubReaction {
  kind: HubReactionKind;
  userId: string;
}

export interface MentionableUser {
  id: string;
  name: string;
}

export type HubMentionSource = "discussion_post" | "task";

export interface HubMentionNotification {
  id: string;
  userId: string;
  unionId: string;
  localId: string;
  source: HubMentionSource;
  sourceId: string;
  /** Discussion thread id when source is discussion_post. */
  threadId?: string;
  preview: string;
  createdAt: string;
  readAt?: string;
}
