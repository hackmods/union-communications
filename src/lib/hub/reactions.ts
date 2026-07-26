import type { HubReaction, HubReactionKind } from "@/types/hub-social";

export function toggleHubReaction(
  reactions: HubReaction[],
  kind: HubReactionKind,
  userId: string,
): HubReaction[] {
  const exists = reactions.some(
    (reaction) => reaction.kind === kind && reaction.userId === userId,
  );
  if (exists) {
    return reactions.filter(
      (reaction) => !(reaction.kind === kind && reaction.userId === userId),
    );
  }
  return [...reactions, { kind, userId }];
}

export function countHubReactions(
  reactions: HubReaction[],
  kind: HubReactionKind,
): number {
  return reactions.filter((reaction) => reaction.kind === kind).length;
}

export function userHasHubReaction(
  reactions: HubReaction[],
  kind: HubReactionKind,
  userId: string,
): boolean {
  return reactions.some(
    (reaction) => reaction.kind === kind && reaction.userId === userId,
  );
}
