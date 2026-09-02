import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as listOfficers, POST as createOfficer } from "@/app/api/officers/route";
import {
  DELETE as deleteOfficer,
  GET as getOfficer,
  PATCH as patchOfficer,
} from "@/app/api/officers/[id]/route";
import {
  memoryOfficerRosterStore,
  resetOfficerRosterMemoryForTests,
} from "./memory-adapter";
import { resetOfficerRosterStore } from "./store";

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

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validCreate = {
  name: "Sam Okonkwo",
  role: "Secretary",
  termStart: "2026-09-01",
  termEnd: "2028-08-31",
  email: "secretary.243@unionops.test",
};

describe("officer roster API routes", () => {
  beforeEach(() => {
    resetOfficerRosterMemoryForTests();
    resetOfficerRosterStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetOfficerRosterMemoryForTests();
    resetOfficerRosterStore();
  });

  describe("GET /api/officers", () => {
    it("returns 401 without a session and 403 for members, stewards, and local_exec", async () => {
      authMock.mockResolvedValue(null);
      expect((await listOfficers()).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect((await listOfficers()).status).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect((await listOfficers()).status).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["local_exec"] }));
      const exec = await listOfficers();
      expect(exec.status).toBe(403);
      expect(await exec.json()).toEqual({ error: "Forbidden" });
    });

    it("does not list another union or another local for a president", async () => {
      await memoryOfficerRosterStore.create(
        { name: "Other union", role: "President", termStart: "2026-01-01" },
        { unionId: "union-other", localId: "local-243" },
      );
      await memoryOfficerRosterStore.create(
        { name: "Other local", role: "President", termStart: "2026-01-01" },
        { unionId: "union-opseu", localId: "local-560" },
      );

      authMock.mockResolvedValue(session());
      const res = await listOfficers();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        officers: Array<{ name: string; unionId: string; localId: string }>;
      };
      expect(body.officers.every((o) => o.unionId === "union-opseu")).toBe(true);
      expect(body.officers.every((o) => o.localId === "local-243")).toBe(true);
      expect(body.officers.map((o) => o.name)).not.toContain("Other union");
      expect(body.officers.map((o) => o.name)).not.toContain("Other local");
    });
  });

  describe("POST /api/officers", () => {
    it("rejects forged tenant keys and stamps the session union/local", async () => {
      authMock.mockResolvedValue(session());
      const forged = await createOfficer(
        jsonRequest({
          ...validCreate,
          unionId: "union-other",
          localId: "local-evil",
        }),
      );
      expect(forged.status).toBe(400);

      const created = await createOfficer(jsonRequest(validCreate));
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        officer: { unionId: string; localId: string; name: string; role: string };
      };
      expect(body.officer.unionId).toBe("union-opseu");
      expect(body.officer.localId).toBe("local-243");
      expect(body.officer.name).toBe("Sam Okonkwo");
      expect(body.officer.role).toBe("Secretary");
    });

    it("returns 400 when the session has no local", async () => {
      authMock.mockResolvedValue(session({ localId: null, roles: ["union_admin"] }));
      const res = await createOfficer(jsonRequest(validCreate));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Local required" });
    });

    it("returns 403 when a steward tries to create a roster row", async () => {
      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect((await createOfficer(jsonRequest(validCreate))).status).toBe(403);
    });
  });

  describe("GET/PATCH/DELETE /api/officers/[id]", () => {
    it("returns 404 for a missing id", async () => {
      authMock.mockResolvedValue(session());
      const missing = await getOfficer(new Request("http://localhost"), params("off-missing"));
      expect(missing.status).toBe(404);
      expect(await missing.json()).toEqual({ error: "Not found" });
    });

    it("returns 403 for another union, including platform_admin, and does not mutate", async () => {
      const foreign = await memoryOfficerRosterStore.create(
        { name: "Foreign officer", role: "President", termStart: "2026-01-01" },
        { unionId: "union-other", localId: "local-1" },
      );

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const viewed = await getOfficer(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(viewed.status).toBe(403);
      expect(await viewed.json()).toEqual({ error: "Forbidden" });

      const patched = await patchOfficer(
        jsonRequest({ role: "Hijacked" }),
        params(foreign.id),
      );
      expect(patched.status).toBe(403);
      expect((await memoryOfficerRosterStore.getById(foreign.id))?.role).toBe(
        "President",
      );

      const deleted = await deleteOfficer(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(deleted.status).toBe(403);
      expect(await memoryOfficerRosterStore.getById(foreign.id)).not.toBeNull();
    });

    it("lets a union_admin read another local in the same union, but a president cannot", async () => {
      const otherLocal = await memoryOfficerRosterStore.create(
        { name: "Local 560 chair", role: "President", termStart: "2026-01-01" },
        { unionId: "union-opseu", localId: "local-560" },
      );

      authMock.mockResolvedValue(session());
      const president = await getOfficer(
        new Request("http://localhost"),
        params(otherLocal.id),
      );
      expect(president.status).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["union_admin"] }));
      const admin = await getOfficer(
        new Request("http://localhost"),
        params(otherLocal.id),
      );
      expect(admin.status).toBe(200);
      const body = (await admin.json()) as { officer: { localId: string } };
      expect(body.officer.localId).toBe("local-560");
    });

    it("clears optional fields on PATCH and deletes a same-local row", async () => {
      authMock.mockResolvedValue(session());
      const cleared = await patchOfficer(
        jsonRequest({ email: null, termEnd: null }),
        params("off-001"),
      );
      expect(cleared.status).toBe(200);
      const body = (await cleared.json()) as {
        officer: { email?: string; termEnd?: string };
      };
      expect(body.officer.email).toBeUndefined();
      expect(body.officer.termEnd).toBeUndefined();

      const deleted = await deleteOfficer(
        new Request("http://localhost"),
        params("off-001"),
      );
      expect(deleted.status).toBe(200);
      expect(await memoryOfficerRosterStore.getById("off-001")).toBeNull();
    });

    it("rejects tenant identity keys on PATCH", async () => {
      authMock.mockResolvedValue(session());
      const res = await patchOfficer(
        jsonRequest({ unionId: "union-other", role: "Treasurer" }),
        params("off-002"),
      );
      expect(res.status).toBe(400);
      expect((await memoryOfficerRosterStore.getById("off-002"))?.role).toBe(
        "Vice-President",
      );
    });
  });
});
