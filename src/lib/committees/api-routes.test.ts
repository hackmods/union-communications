import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listCommittees,
  POST as createCommittee,
} from "@/app/api/committees/route";
import {
  DELETE as deleteCommittee,
  GET as getCommittee,
  PATCH as patchCommittee,
} from "@/app/api/committees/[id]/route";
import {
  memoryCommitteesStore,
  resetCommitteesMemoryForTests,
} from "./memory-adapter";
import { resetCommitteesStore } from "./store";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-7",
      name: "Local 777 President",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-b7p"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-7"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validCreate = {
  name: "Grievance",
  description: "Casework triage.",
  memberOfficerIds: ["off-003"],
};

describe("committees API routes", () => {
  beforeEach(() => {
    resetCommitteesMemoryForTests();
    resetCommitteesStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetCommitteesMemoryForTests();
    resetCommitteesStore();
  });

  describe("GET /api/committees", () => {
    it("returns 401 without a session and 403 for members, stewards, and local_exec", async () => {
      authMock.mockResolvedValue(null);
      expect((await listCommittees()).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect((await listCommittees()).status).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect((await listCommittees()).status).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["local_exec"] }));
      const exec = await listCommittees();
      expect(exec.status).toBe(403);
      expect(await exec.json()).toEqual({ error: "Forbidden" });
    });

    it("does not list another union or another local for a president", async () => {
      await memoryCommitteesStore.create(
        { name: "Other union H&S" },
        { unionId: "union-other", localId: "local-7" },
      );
      await memoryCommitteesStore.create(
        { name: "Other local social" },
        { unionId: "union-b7p", localId: "local-1337" },
      );

      authMock.mockResolvedValue(session());
      const res = await listCommittees();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        committees: Array<{ name: string; unionId: string; localId: string }>;
      };
      expect(body.committees.every((c) => c.unionId === "union-b7p")).toBe(true);
      expect(body.committees.every((c) => c.localId === "local-7")).toBe(true);
      expect(body.committees.map((c) => c.name)).not.toContain("Other union H&S");
      expect(body.committees.map((c) => c.name)).not.toContain("Other local social");
    });

    it("fails closed when a local president has no active local context", async () => {
      await memoryCommitteesStore.create(
        { name: "Other local confidential committee" },
        { unionId: "union-b7p", localId: "local-1337" },
      );

      authMock.mockResolvedValue(session({ localId: null }));
      const res = await listCommittees();
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Local context required" });

      const detail = await getCommittee(
        new Request("http://localhost"),
        params("com-001"),
      );
      expect(detail.status).toBe(403);
      expect(await detail.json()).toEqual({ error: "Local context required" });
    });
  });

  describe("POST /api/committees", () => {
    it("rejects forged tenant keys and stamps the session union/local", async () => {
      authMock.mockResolvedValue(session());
      const forged = await createCommittee(
        jsonRequest({
          ...validCreate,
          unionId: "union-other",
          localId: "local-evil",
        }),
      );
      expect(forged.status).toBe(400);

      const created = await createCommittee(jsonRequest(validCreate));
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        committee: {
          unionId: string;
          localId: string;
          name: string;
          memberOfficerIds: string[];
          memberUserIds: string[];
        };
      };
      expect(body.committee.unionId).toBe("union-b7p");
      expect(body.committee.localId).toBe("local-7");
      expect(body.committee.name).toBe("Grievance");
      expect(body.committee.memberOfficerIds).toEqual(["off-003"]);
      expect(body.committee.memberUserIds).toEqual([]);
    });

    it("does not accept account-linked committee members in memory mode", async () => {
      authMock.mockResolvedValue(session());
      const res = await createCommittee(jsonRequest({ ...validCreate, memberUserIds: ["member-123"] }));
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "Account-linked committee membership requires Postgres" });
    });

    it("returns 400 when the session has no local", async () => {
      authMock.mockResolvedValue(
        session({ localId: null, roles: ["union_admin"] }),
      );
      const res = await createCommittee(jsonRequest(validCreate));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Local required" });
    });
  });

  describe("GET/PATCH/DELETE /api/committees/[id]", () => {
    it("returns 404 for a missing id and 403 for another union, including platform_admin", async () => {
      const foreign = await memoryCommitteesStore.create(
        { name: "Foreign committee" },
        { unionId: "union-other", localId: "local-1" },
      );

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const missing = await getCommittee(
        new Request("http://localhost"),
        params("com-missing"),
      );
      expect(missing.status).toBe(404);

      const viewed = await getCommittee(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(viewed.status).toBe(403);
      expect(await viewed.json()).toEqual({ error: "Forbidden" });

      const patched = await patchCommittee(
        jsonRequest({ name: "Hijacked" }),
        params(foreign.id),
      );
      expect(patched.status).toBe(403);
      expect((await memoryCommitteesStore.getById(foreign.id))?.name).toBe(
        "Foreign committee",
      );

      const deleted = await deleteCommittee(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(deleted.status).toBe(403);
      expect(await memoryCommitteesStore.getById(foreign.id)).not.toBeNull();
    });

    it("lets a union_admin read another local in the same union, but a president cannot", async () => {
      const otherLocal = await memoryCommitteesStore.create(
        { name: "Local 560 H&S" },
        { unionId: "union-b7p", localId: "local-1337" },
      );

      authMock.mockResolvedValue(session());
      expect(
        (
          await getCommittee(
            new Request("http://localhost"),
            params(otherLocal.id),
          )
        ).status,
      ).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["union_admin"] }));
      const admin = await getCommittee(
        new Request("http://localhost"),
        params(otherLocal.id),
      );
      expect(admin.status).toBe(200);
      const body = (await admin.json()) as { committee: { localId: string } };
      expect(body.committee.localId).toBe("local-1337");
    });

    it("clears description on PATCH and deletes a same-local committee", async () => {
      authMock.mockResolvedValue(session());
      const cleared = await patchCommittee(
        jsonRequest({ description: null, memberOfficerIds: ["off-001", "off-002"] }),
        params("com-001"),
      );
      expect(cleared.status).toBe(200);
      const body = (await cleared.json()) as {
        committee: { description?: string; memberOfficerIds: string[]; memberUserIds: string[] };
      };
      expect(body.committee.description).toBeUndefined();
      expect(body.committee.memberOfficerIds).toEqual(["off-001", "off-002"]);
      expect(body.committee.memberUserIds).toEqual([]);

      const deleted = await deleteCommittee(
        new Request("http://localhost"),
        params("com-001"),
      );
      expect(deleted.status).toBe(200);
      expect(await memoryCommitteesStore.getById("com-001")).toBeNull();
    });

    it("rejects tenant identity keys on PATCH", async () => {
      authMock.mockResolvedValue(session());
      const res = await patchCommittee(
        jsonRequest({ unionId: "union-other", name: "Renamed" }),
        params("com-002"),
      );
      expect(res.status).toBe(400);
      expect((await memoryCommitteesStore.getById("com-002"))?.name).toBe("Social");
    });

    it("does not accept account-linked committee edits in memory mode", async () => {
      authMock.mockResolvedValue(session());
      const res = await patchCommittee(
        jsonRequest({ memberUserIds: ["member-123"] }),
        params("com-001"),
      );
      expect(res.status).toBe(503);
      expect((await memoryCommitteesStore.getById("com-001"))?.memberUserIds).toEqual([]);
    });
  });
});
