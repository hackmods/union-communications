import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";
import type { HubMentionNotification } from "@/types/hub-social";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listNotifications,
  PATCH as markNotifications,
} from "@/app/api/hub/notifications/route";
import {
  hubNotificationStore,
  resetHubNotifications,
} from "@/lib/hub/notifications/store";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-steward-243",
      name: "Local 243 Steward",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      roles: input?.roles ?? (["local_steward"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

describe("hub notification HTTP routes", () => {
  beforeEach(() => {
    resetHubNotifications();
    authMock.mockReset();
  });

  afterEach(() => {
    resetHubNotifications();
  });

  it("returns 401 without a session or union and 400 for invalid mark bodies", async () => {
    authMock.mockResolvedValue(null);
    expect(
      (
        await listNotifications(
          new Request("http://localhost/api/hub/notifications"),
        )
      ).status,
    ).toBe(401);

    authMock.mockResolvedValue(session({ unionId: null }));
    expect(
      (
        await listNotifications(
          new Request("http://localhost/api/hub/notifications"),
        )
      ).status,
    ).toBe(401);

    authMock.mockResolvedValue(session());
    expect((await markNotifications(jsonRequest({}))).status).toBe(400);
    expect((await markNotifications(jsonRequest({ ids: [] }))).status).toBe(400);

    const invalidJson = await markNotifications({
      json: async () => {
        throw new Error("bad json");
      },
    } as Request);
    expect(invalidJson.status).toBe(400);
    expect(await invalidJson.json()).toEqual({ error: "Invalid JSON" });
  });

  it("lists only the session user's rows in the session union", async () => {
    const [own, otherUnion, otherUser] = await hubNotificationStore.createMany([
      {
        userId: "user-steward-243",
        unionId: "union-opseu",
        localId: "local-243",
        source: "task",
        sourceId: "task-home",
        preview: "Home mention",
      },
      {
        userId: "user-steward-243",
        unionId: "union-other",
        localId: "local-1",
        source: "task",
        sourceId: "task-foreign",
        preview: "Other union mention",
      },
      {
        userId: "user-president-243",
        unionId: "union-opseu",
        localId: "local-243",
        source: "discussion_post",
        sourceId: "post-1",
        preview: "Someone else's mention",
      },
    ]);

    authMock.mockResolvedValue(session());
    const res = await listNotifications(
      new Request("http://localhost/api/hub/notifications"),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      notifications: HubMentionNotification[];
    };
    const ids = body.notifications.map((row) => row.id);
    expect(ids).toContain(own.id);
    expect(ids).not.toContain(otherUnion.id);
    expect(ids).not.toContain(otherUser.id);
    expect(body.notifications.every((row) => row.unionId === "union-opseu")).toBe(
      true,
    );
    expect(body.notifications.every((row) => row.userId === "user-steward-243")).toBe(
      true,
    );
  });

  it("marks only the caller's unread ids and ignores another user's row", async () => {
    const [own, otherUser] = await hubNotificationStore.createMany([
      {
        userId: "user-steward-243",
        unionId: "union-opseu",
        localId: "local-243",
        source: "task",
        sourceId: "task-own",
        preview: "Own unread",
      },
      {
        userId: "user-president-243",
        unionId: "union-opseu",
        localId: "local-243",
        source: "task",
        sourceId: "task-other",
        preview: "Other unread",
      },
    ]);

    authMock.mockResolvedValue(session());
    const marked = await markNotifications(
      jsonRequest({ ids: [own.id, otherUser.id] }),
    );
    expect(marked.status).toBe(200);
    expect(await marked.json()).toEqual({ marked: 1 });

    const unread = await listNotifications(
      new Request("http://localhost/api/hub/notifications?unread=1"),
    );
    expect(unread.status).toBe(200);
    const unreadBody = (await unread.json()) as {
      notifications: Array<{ id: string }>;
    };
    expect(unreadBody.notifications.map((row) => row.id)).not.toContain(own.id);

    authMock.mockResolvedValue(
      session({ id: "user-president-243", roles: ["local_president"] }),
    );
    const stillUnread = await listNotifications(
      new Request("http://localhost/api/hub/notifications?unread=1"),
    );
    const stillBody = (await stillUnread.json()) as {
      notifications: Array<{ id: string }>;
    };
    expect(stillBody.notifications.map((row) => row.id)).toContain(otherUser.id);
  });
});
