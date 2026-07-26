import type { HubMentionNotification } from "@/types/hub-social";

function newId(): string {
  return `hub-notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const notifications: HubMentionNotification[] = [];

export interface CreateMentionNotificationInput {
  userId: string;
  unionId: string;
  localId: string;
  source: HubMentionNotification["source"];
  sourceId: string;
  threadId?: string;
  preview: string;
}

export const hubNotificationStore = {
  async createMany(
    inputs: CreateMentionNotificationInput[],
  ): Promise<HubMentionNotification[]> {
    const created: HubMentionNotification[] = [];
    const ts = new Date().toISOString();
    for (const input of inputs) {
      const row: HubMentionNotification = {
        id: newId(),
        userId: input.userId,
        unionId: input.unionId,
        localId: input.localId,
        source: input.source,
        sourceId: input.sourceId,
        threadId: input.threadId,
        preview: input.preview.slice(0, 240),
        createdAt: ts,
      };
      notifications.push(row);
      created.push(row);
    }
    return created;
  },

  async listForUser(
    userId: string,
    unionId: string,
    opts?: { unreadOnly?: boolean },
  ): Promise<HubMentionNotification[]> {
    return notifications
      .filter((row) => row.userId === userId && row.unionId === unionId)
      .filter((row) => (opts?.unreadOnly ? !row.readAt : true))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  },

  async markRead(userId: string, ids: string[]): Promise<number> {
    const ts = new Date().toISOString();
    let count = 0;
    for (const row of notifications) {
      if (row.userId !== userId || !ids.includes(row.id) || row.readAt) continue;
      row.readAt = ts;
      count += 1;
    }
    return count;
  },
};

/** @internal test helper */
export function resetHubNotifications(): void {
  notifications.length = 0;
}
