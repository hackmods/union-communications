import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as listTasks, POST as createTask } from "@/app/api/tasks/route";
import {
  DELETE as deleteTask,
  GET as getTask,
  PATCH as patchTask,
} from "@/app/api/tasks/[id]/route";
import { POST as toggleTaskReaction } from "@/app/api/tasks/[id]/reactions/route";
import { memoryTaskStore, resetTaskMemoryForTests } from "./memory-adapter";
import { resetTaskStore } from "./store";
import {
  createOverlayUnion,
  resetTenantOverlayForTests,
} from "@/lib/tenant/overlay";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  bargainingUnitId?: string;
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
      bargainingUnitId: input?.bargainingUnitId,
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
  return new Request(`http://localhost/api/tasks${query}`);
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validCreate = {
  title: "Prep Step 2 notes",
};

describe("tasks API routes", () => {
  beforeEach(() => {
    resetTaskMemoryForTests();
    resetTaskStore();
    resetTenantOverlayForTests();
    authMock.mockReset();
  });

  afterEach(() => {
    resetTaskMemoryForTests();
    resetTaskStore();
    resetTenantOverlayForTests();
  });

  describe("GET /api/tasks", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await listTasks(listRequest())).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listTasks(listRequest());
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("does not list another union or another local for a president", async () => {
      await memoryTaskStore.create(
        { title: "Other union file" },
        {
          unionId: "union-other",
          localId: "local-243",
          createdById: "user-x",
          assigneeId: "user-x",
        },
      );
      await memoryTaskStore.create(
        { title: "Other local file" },
        {
          unionId: "union-opseu",
          localId: "local-560",
          createdById: "user-y",
          assigneeId: "user-y",
        },
      );

      authMock.mockResolvedValue(session());
      const res = await listTasks(listRequest());
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        tasks: Array<{ title: string; unionId: string; localId: string }>;
      };
      expect(body.tasks.every((task) => task.unionId === "union-opseu")).toBe(
        true,
      );
      expect(body.tasks.every((task) => task.localId === "local-243")).toBe(
        true,
      );
      expect(body.tasks.map((task) => task.title)).not.toContain(
        "Other union file",
      );
      expect(body.tasks.map((task) => task.title)).not.toContain(
        "Other local file",
      );
    });

    it("ignores an unknown status and returns only the caller's tasks for mine=1", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-steward-243", roles: ["local_steward"] }),
      );
      const ignored = await listTasks(listRequest("?status=archived"));
      expect(ignored.status).toBe(200);
      const ignoredBody = (await ignored.json()) as {
        tasks: Array<{ id: string; status: string }>;
      };
      expect(ignoredBody.tasks.some((task) => task.id === "task-001")).toBe(
        true,
      );
      expect(ignoredBody.tasks.some((task) => task.status === "done")).toBe(
        true,
      );

      const mine = await listTasks(listRequest("?mine=1"));
      const mineBody = (await mine.json()) as {
        tasks: Array<{ id: string; assigneeId: string }>;
      };
      expect(mineBody.tasks.length).toBeGreaterThan(0);
      expect(
        mineBody.tasks.every((task) => task.assigneeId === "user-steward-243"),
      ).toBe(true);
    });

    it("returns changed:false when nothing is newer than since", async () => {
      authMock.mockResolvedValue(session());
      const future = new Date(Date.now() + 60_000).toISOString();
      const res = await listTasks(listRequest(`?since=${encodeURIComponent(future)}`));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ changed: false, tasks: [] });
    });
  });

  describe("POST /api/tasks", () => {
    it("rejects forged tenant keys and stamps the session union/local/creator", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-steward-243", roles: ["local_steward"] }),
      );
      const forged = await createTask(
        jsonRequest({
          ...validCreate,
          unionId: "union-other",
          localId: "local-evil",
          createdById: "attacker",
        }),
      );
      expect(forged.status).toBe(400);

      const created = await createTask(jsonRequest(validCreate));
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        task: {
          unionId: string;
          localId: string;
          createdById: string;
          assigneeId: string;
          status: string;
        };
      };
      expect(body.task.unionId).toBe("union-opseu");
      expect(body.task.localId).toBe("local-243");
      expect(body.task.createdById).toBe("user-steward-243");
      expect(body.task.assigneeId).toBe("user-steward-243");
      expect(body.task.status).toBe("open");
    });

    it("lets a steward create for themselves but not assign others", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-steward-243", roles: ["local_steward"] }),
      );
      const forbidden = await createTask(
        jsonRequest({
          title: "Assign the president",
          assigneeId: "user-president-243",
        }),
      );
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({
        error: "Only elevated officers may assign others",
      });
    });

    it("lets a president assign another officer", async () => {
      authMock.mockResolvedValue(session());
      const created = await createTask(
        jsonRequest({
          title: "Follow up with steward",
          assigneeId: "user-steward-243",
        }),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        task: { assigneeId: string; createdById: string };
      };
      expect(body.task.assigneeId).toBe("user-steward-243");
      expect(body.task.createdById).toBe("user-president-243");
    });

    it("returns 403 when the tasks module is off for that tenant", async () => {
      const tenant = createOverlayUnion({
        name: "Comms Only Local",
        enabledModules: ["comms", "grievance"],
        localNumber: "888",
      });
      authMock.mockResolvedValue(
        session({
          id: "user-steward-888",
          unionId: tenant.union.id,
          localId: tenant.locals![0]!.id,
          roles: ["local_steward"],
        }),
      );
      const res = await createTask(jsonRequest(validCreate));
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Module not enabled" });
    });
  });

  describe("GET/PATCH/DELETE /api/tasks/[id]", () => {
    it("returns 404 for a missing id and 403 for another union, including platform_admin", async () => {
      const foreign = await memoryTaskStore.create(
        { title: "Foreign task" },
        {
          unionId: "union-other",
          localId: "local-1",
          createdById: "user-other",
          assigneeId: "user-other",
        },
      );

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const missing = await getTask(
        new Request("http://localhost"),
        params("task-missing"),
      );
      expect(missing.status).toBe(404);

      const viewed = await getTask(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(viewed.status).toBe(403);
      expect(await viewed.json()).toEqual({ error: "Forbidden" });

      const patched = await patchTask(
        jsonRequest({ title: "Hijacked" }),
        params(foreign.id),
      );
      expect(patched.status).toBe(403);
      expect((await memoryTaskStore.getById(foreign.id))?.title).toBe(
        "Foreign task",
      );

      const deleted = await deleteTask(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(deleted.status).toBe(403);
      expect(await memoryTaskStore.getById(foreign.id)).not.toBeNull();
    });

    it("lets the assignee mark done but not edit or delete another officer's task", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-steward-243", roles: ["local_steward"] }),
      );

      const done = await patchTask(
        jsonRequest({ status: "done" }),
        params("task-001"),
      );
      expect(done.status).toBe(200);
      expect((await memoryTaskStore.getById("task-001"))?.status).toBe("done");

      const reassignOther = await patchTask(
        jsonRequest({ status: "done" }),
        params("task-002"),
      );
      expect(reassignOther.status).toBe(403);

      const editOther = await patchTask(
        jsonRequest({ title: "Rewrite booking" }),
        params("task-002"),
      );
      expect(editOther.status).toBe(403);
      expect((await memoryTaskStore.getById("task-002"))?.title).toContain(
        "LEC room",
      );

      expect(
        (await deleteTask(new Request("http://localhost"), params("task-001")))
          .status,
      ).toBe(403);
      expect(await memoryTaskStore.getById("task-001")).not.toBeNull();
    });

    it("rejects tenant keys on update and lets the creator delete", async () => {
      authMock.mockResolvedValue(session());
      const forged = await patchTask(
        jsonRequest({ title: "Keep tenant", unionId: "union-other" }),
        params("task-002"),
      );
      expect(forged.status).toBe(400);
      expect((await memoryTaskStore.getById("task-002"))?.unionId).toBe(
        "union-opseu",
      );

      const deleted = await deleteTask(
        new Request("http://localhost"),
        params("task-002"),
      );
      expect(deleted.status).toBe(200);
      expect(await memoryTaskStore.getById("task-002")).toBeNull();
    });
  });

  describe("POST /api/tasks/[id]/reactions", () => {
    it("returns 404 when missing and 403 for another union with no write", async () => {
      const foreign = await memoryTaskStore.create(
        { title: "Foreign reaction" },
        {
          unionId: "union-other",
          localId: "local-1",
          createdById: "user-other",
          assigneeId: "user-other",
        },
      );
      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));

      expect(
        (await toggleTaskReaction(jsonRequest({ kind: "ack" }), params("missing")))
          .status,
      ).toBe(404);

      const forbidden = await toggleTaskReaction(
        jsonRequest({ kind: "ack" }),
        params(foreign.id),
      );
      expect(forbidden.status).toBe(403);
      expect((await memoryTaskStore.getById(foreign.id))?.reactions).toEqual([]);
    });

    it("lets a steward toggle a reaction and rejects extra keys", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-steward-243", roles: ["local_steward"] }),
      );
      const extra = await toggleTaskReaction(
        jsonRequest({ kind: "solidarity", userId: "attacker" }),
        params("task-001"),
      );
      expect(extra.status).toBe(400);

      const toggled = await toggleTaskReaction(
        jsonRequest({ kind: "solidarity" }),
        params("task-001"),
      );
      expect(toggled.status).toBe(200);
      const body = (await toggled.json()) as {
        task: { reactions: Array<{ kind: string; userId: string }> };
      };
      expect(body.task.reactions).toEqual(
        expect.arrayContaining([
          { kind: "solidarity", userId: "user-steward-243" },
        ]),
      );
    });
  });
});
