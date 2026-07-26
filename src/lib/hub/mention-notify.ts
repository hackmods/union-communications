import { hubNotificationStore } from "@/lib/hub/notifications/store";
import { extractMentionedUserIds } from "@/lib/hub/mentions";
import { listMentionableHubUsers } from "@/lib/hub/mentionables";
import type { HubMentionSource } from "@/types/hub-social";

export async function resolveMentionedUserIds(
  body: string,
  scope: {
    unionId: string;
    localId?: string;
    accessibleLocalIds?: string[];
  },
): Promise<string[]> {
  const roster = await listMentionableHubUsers(scope);
  return extractMentionedUserIds(body, roster);
}

export async function notifyMentionedUsers(input: {
  body: string;
  authorId: string;
  unionId: string;
  localId: string;
  accessibleLocalIds?: string[];
  source: HubMentionSource;
  sourceId: string;
  threadId?: string;
}): Promise<void> {
  const mentionedUserIds = await resolveMentionedUserIds(input.body, {
    unionId: input.unionId,
    localId: input.localId,
    accessibleLocalIds: input.accessibleLocalIds,
  });
  const targets = mentionedUserIds.filter((id) => id !== input.authorId);
  if (targets.length === 0) return;
  await hubNotificationStore.createMany(
    targets.map((userId) => ({
      userId,
      unionId: input.unionId,
      localId: input.localId,
      source: input.source,
      sourceId: input.sourceId,
      threadId: input.threadId,
      preview: input.body,
    })),
  );
}
