import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listThreads,
  POST as createThread,
} from "@/app/api/discussions/route";
import {
  GET as listPosts,
  POST as createPost,
} from "@/app/api/discussions/[id]/posts/route";
import { POST as toggleReaction } from "@/app/api/discussions/[id]/posts/[postId]/reactions/route";
import {
  memoryDiscussionsStore,
  resetMemoryDiscussions,
} from "./memory-adapter";
import { resetDiscussionsStore } from "./store";
import {
  createOverlayUnion,
  resetTenantOverlayForTests,
} from "@/lib/tenant/overlay";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-243",
      name: "Local 243 President",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function listRequest(query = ""): Request {
  return new Request(`http://localhost/api/discussions${query}`);
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function reactionParams(id: string, postId: string) {
  return { params: Promise.resolve({ id, postId }) };
}

const validCreate = {
  title: "Board duty rotation",
  body: "Who can cover Thursday evening?",
};

describe("discussions API routes", () => {
  beforeEach(() => {
    resetMemoryDiscussions();
    resetDiscussionsStore();
    resetTenantOverlayForTests();
    authMock.mockReset();
  });

  afterEach(() => {
    resetMemoryDiscussions();
    resetDiscussionsStore();
    resetTenantOverlayForTests();
  });

  describe("GET/POST /api/discussions", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await listThreads(listRequest())).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listThreads(listRequest());
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("does not list another union or another local for a president", async () => {
      await memoryDiscussionsStore.createThread(
        { title: "Other union", body: "Must never appear" },
        {
          unionId: "union-other",
          localId: "local-243",
          createdById: "user-x",
          createdByName: "X",
        },
      );
      await memoryDiscussionsStore.createThread(
        { title: "Other local", body: "Same union, other local" },
        {
          unionId: "union-opseu",
          localId: "local-560",
          createdById: "user-y",
          createdByName: "Y",
        },
      );

      authMock.mockResolvedValue(session());
      const res = await listThreads(listRequest());
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        threads: Array<{ title: string; unionId: string; localId: string }>;
      };
      expect(body.threads.every((t) => t.unionId === "union-opseu")).toBe(true);
      expect(body.threads.every((t) => t.localId === "local-243")).toBe(true);
      expect(body.threads.map((t) => t.title)).not.toContain("Other union");
      expect(body.threads.map((t) => t.title)).not.toContain("Other local");
    });

    it("rejects forged tenant keys and stamps the session union/local/creator", async () => {
      authMock.mockResolvedValue(session());
      const forged = await createThread(
        jsonRequest({
          ...validCreate,
          unionId: "union-other",
          localId: "local-evil",
          createdById: "user-attacker",
        }),
      );
      expect(forged.status).toBe(400);

      const created = await createThread(jsonRequest(validCreate));
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        thread: {
          unionId: string;
          localId: string;
          title: string;
          createdById: string;
          postCount: number;
        };
      };
      expect(body.thread.unionId).toBe("union-opseu");
      expect(body.thread.localId).toBe("local-243");
      expect(body.thread.title).toBe("Board duty rotation");
      expect(body.thread.createdById).toBe("user-president-243");
      expect(body.thread.postCount).toBe(1);
    });

    it("returns 400 when a thread tries to link both a grievance and a bumping case", async () => {
      authMock.mockResolvedValue(session());
      const res = await createThread(
        jsonRequest({
          ...validCreate,
          grievanceId: "grev-001",
          bumpingCaseId: "bump-001",
        }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 403 when the discussions module is off for that tenant", async () => {
      const tenant = createOverlayUnion({
        name: "Comms Only Local",
        enabledModules: ["comms", "grievance"],
        localNumber: "888",
      });
      authMock.mockResolvedValue(
        session({
          id: "user-president-888",
          unionId: tenant.union.id,
          localId: tenant.locals![0]!.id,
        }),
      );
      const res = await listThreads(listRequest());
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Module not enabled" });
    });
  });

  describe("GET/POST /api/discussions/[id]/posts and reactions", () => {
    it("returns 404 for a missing thread and 403 for another union, including platform_admin", async () => {
      const foreign = await memoryDiscussionsStore.createThread(
        { title: "Foreign thread", body: "Keep out" },
        {
          unionId: "union-other",
          localId: "local-1",
          createdById: "user-other",
          createdByName: "Other",
        },
      );
      const foreignPosts = await memoryDiscussionsStore.listPosts(foreign.id);
      const foreignPostId = foreignPosts[0]!.id;

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      expect(
        (
          await listPosts(
            new Request("http://localhost"),
            params("disc-missing"),
          )
        ).status,
      ).toBe(404);

      const viewed = await listPosts(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(viewed.status).toBe(403);
      expect(await viewed.json()).toEqual({ error: "Forbidden" });

      const posted = await createPost(
        jsonRequest({ body: "Hijack" }),
        params(foreign.id),
      );
      expect(posted.status).toBe(403);
      expect((await memoryDiscussionsStore.listPosts(foreign.id)).length).toBe(1);

      const reacted = await toggleReaction(
        jsonRequest({ kind: "ack" }),
        reactionParams(foreign.id, foreignPostId),
      );
      expect(reacted.status).toBe(403);
      expect(
        (await memoryDiscussionsStore.getPost(foreignPostId))?.reactions,
      ).toEqual([]);
    });

    it("lets a steward post on a standalone thread and toggle a reaction", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-steward-243", roles: ["local_steward"] }),
      );
      const posted = await createPost(
        jsonRequest({ body: "I can cover Thursday." }),
        params("disc-thread-001"),
      );
      expect(posted.status).toBe(201);
      const body = (await posted.json()) as {
        post: { authorId: string; unionId: string; body: string };
      };
      expect(body.post.authorId).toBe("user-steward-243");
      expect(body.post.unionId).toBe("union-opseu");
      expect(body.post.body).toBe("I can cover Thursday.");

      const extraKeys = await toggleReaction(
        jsonRequest({ kind: "ack", userId: "user-attacker" }),
        reactionParams("disc-thread-001", "disc-post-001"),
      );
      expect(extraKeys.status).toBe(400);

      const reacted = await toggleReaction(
        jsonRequest({ kind: "ack" }),
        reactionParams("disc-thread-001", "disc-post-001"),
      );
      expect(reacted.status).toBe(200);
      const reactionBody = (await reacted.json()) as {
        post: { reactions: Array<{ kind: string; userId: string }> };
      };
      expect(reactionBody.post.reactions).toEqual(
        expect.arrayContaining([
          { kind: "ack", userId: "user-steward-243" },
        ]),
      );

      const listed = await listPosts(
        new Request("http://localhost"),
        params("disc-thread-001"),
      );
      expect(listed.status).toBe(200);
      const listedBody = (await listed.json()) as {
        posts: Array<{ body: string }>;
      };
      expect(listedBody.posts.some((p) => p.body === "I can cover Thursday.")).toBe(
        true,
      );
    });

    it("returns 404 when the post does not belong to the thread", async () => {
      authMock.mockResolvedValue(session());
      const res = await toggleReaction(
        jsonRequest({ kind: "solidarity" }),
        reactionParams("disc-thread-001", "disc-post-003"),
      );
      expect(res.status).toBe(404);
    });
  });
});
