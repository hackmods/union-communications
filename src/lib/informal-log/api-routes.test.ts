import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as listLogs, POST as createLog } from "@/app/api/informal-log/route";
import {
  DELETE as deleteLog,
  GET as getLog,
  PATCH as patchLog,
} from "@/app/api/informal-log/[id]/route";
import { POST as convertLog } from "@/app/api/informal-log/[id]/convert/route";
import { memoryInformalLogStore, resetInformalLogMemoryForTests } from "./memory-adapter";
import { resetInformalLogStore } from "./store";
import { grievanceStore, resetGrievanceStore } from "@/lib/grievance/store";
import {
  createOverlayUnion,
  resetTenantOverlayForTests,
} from "@/lib/tenant/overlay";

function session(input?: {
  id?: string;
  unionId?: string;
  localId?: string;
  bargainingUnitId?: string;
  name?: string;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-steward-243",
      name: input?.name ?? "Local 243 Steward",
      unionId: input?.unionId ?? "union-opseu",
      localId: input?.localId ?? "local-243",
      bargainingUnitId: input?.bargainingUnitId,
      roles: input?.roles ?? (["local_steward"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function listRequest(query = ""): Request {
  return new Request(`http://localhost/api/informal-log${query}`);
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validCreate = {
  topic: "Overtime skipped",
  channel: "in_person" as const,
  summary: "Supervisor used the wrong list.",
  occurredAt: "2026-08-20T14:00:00.000Z",
};

describe("informal log API routes", () => {
  beforeEach(() => {
    resetInformalLogMemoryForTests();
    resetInformalLogStore();
    resetGrievanceStore();
    resetTenantOverlayForTests();
    authMock.mockReset();
  });

  afterEach(() => {
    resetInformalLogMemoryForTests();
    resetInformalLogStore();
    resetTenantOverlayForTests();
  });

  describe("GET /api/informal-log", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await listLogs(listRequest())).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listLogs(listRequest());
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("does not list another union or another local for a steward", async () => {
      await memoryInformalLogStore.create(
        {
          topic: "Other union",
          channel: "email",
          summary: "Must never appear",
          occurredAt: "2026-08-21T12:00:00.000Z",
        },
        {
          unionId: "union-other",
          localId: "local-243",
          loggedById: "user-x",
          loggedByName: "X",
        },
      );
      await memoryInformalLogStore.create(
        {
          topic: "Other local",
          channel: "phone",
          summary: "Same union, other local",
          occurredAt: "2026-08-21T13:00:00.000Z",
        },
        {
          unionId: "union-opseu",
          localId: "local-560",
          loggedById: "user-y",
          loggedByName: "Y",
        },
      );

      authMock.mockResolvedValue(session());
      const res = await listLogs(listRequest());
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        entries: Array<{
          id: string;
          unionId: string;
          localId: string;
          topic: string;
        }>;
      };
      expect(body.entries.every((e) => e.unionId === "union-opseu")).toBe(true);
      expect(body.entries.every((e) => e.localId === "local-243")).toBe(true);
      expect(body.entries.map((e) => e.topic)).not.toContain("Other union");
      expect(body.entries.map((e) => e.topic)).not.toContain("Other local");
    });

    it("filters unconverted entries when requested", async () => {
      await memoryInformalLogStore.update("ilog-001", {
        convertedToGrievanceId: "grev-seed",
      });
      authMock.mockResolvedValue(session());
      const res = await listLogs(listRequest("?unconverted=1"));
      const body = (await res.json()) as {
        entries: Array<{ id: string; convertedToGrievanceId?: string }>;
      };
      expect(body.entries.map((e) => e.id)).not.toContain("ilog-001");
      expect(body.entries.every((e) => !e.convertedToGrievanceId)).toBe(true);
    });
  });

  describe("POST /api/informal-log", () => {
    it("rejects forged tenant keys and stamps the session union/local", async () => {
      authMock.mockResolvedValue(session());
      const forged = await createLog(
        jsonRequest({
          ...validCreate,
          unionId: "union-other",
          localId: "local-evil",
        }),
      );
      expect(forged.status).toBe(400);

      const created = await createLog(jsonRequest(validCreate));
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        entry: { unionId: string; localId: string; loggedById: string };
      };
      expect(body.entry.unionId).toBe("union-opseu");
      expect(body.entry.localId).toBe("local-243");
      expect(body.entry.loggedById).toBe("user-steward-243");
    });

    it("returns 403 when a member tries to create a log", async () => {
      authMock.mockResolvedValue(session({ roles: ["stability_member"] }));
      expect((await createLog(jsonRequest(validCreate))).status).toBe(403);
    });
  });

  describe("GET/PATCH/DELETE /api/informal-log/[id]", () => {
    it("returns 404 for a cross-union id, including platform_admin", async () => {
      const foreign = await memoryInformalLogStore.create(
        {
          topic: "Foreign",
          channel: "letter",
          summary: "Other union casework",
          occurredAt: "2026-08-19T09:00:00.000Z",
        },
        {
          unionId: "union-other",
          localId: "local-1",
          loggedById: "user-other",
          loggedByName: "Other",
        },
      );

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const res = await getLog(listRequest(), params(foreign.id));
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Not found" });
    });

    it("blocks edits after convert and rejects unknown update fields", async () => {
      await memoryInformalLogStore.update("ilog-002", {
        convertedToGrievanceId: "grev-existing",
      });
      authMock.mockResolvedValue(session());

      const conflict = await patchLog(
        jsonRequest({ summary: "rewrite after file" }),
        params("ilog-002"),
      );
      expect(conflict.status).toBe(409);

      const invalid = await patchLog(
        jsonRequest({ unionId: "union-other", summary: "ok" }),
        params("ilog-001"),
      );
      expect(invalid.status).toBe(400);
    });

    it("lets the author delete and forbids another steward", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-other-steward", roles: ["local_steward"] }),
      );
      expect((await deleteLog(listRequest(), params("ilog-001"))).status).toBe(
        403,
      );

      authMock.mockResolvedValue(session({ id: "user-steward-243" }));
      const deleted = await deleteLog(listRequest(), params("ilog-001"));
      expect(deleted.status).toBe(200);
      expect(await memoryInformalLogStore.getById("ilog-001")).toBeNull();
    });
  });

  describe("POST /api/informal-log/[id]/convert", () => {
    it("forbids local_exec, including dual steward+exec roles", async () => {
      authMock.mockResolvedValue(session({ roles: ["local_exec"] }));
      expect((await convertLog(listRequest(), params("ilog-001"))).status).toBe(
        403,
      );

      authMock.mockResolvedValue(
        session({ roles: ["local_steward", "local_exec"] }),
      );
      expect((await convertLog(listRequest(), params("ilog-001"))).status).toBe(
        403,
      );
    });

    it("promotes a log into a Step 1 grievance in the entry tenant and then 409s", async () => {
      authMock.mockResolvedValue(session());
      const res = await convertLog(listRequest(), params("ilog-001"));
      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        entry: { convertedToGrievanceId?: string; unionId: string };
        grievance: {
          id: string;
          unionId: string;
          localId: string;
          category: string;
          assignedStewardId: string;
        };
      };
      expect(body.entry.convertedToGrievanceId).toBe(body.grievance.id);
      expect(body.grievance.unionId).toBe("union-opseu");
      expect(body.grievance.localId).toBe("local-243");
      expect(body.grievance.category).toBe("Scheduling / overtime assignment");
      expect(body.grievance.assignedStewardId).toBe("user-steward-243");

      const stored = await grievanceStore.getById(body.grievance.id);
      expect(stored?.grievance.unionId).toBe("union-opseu");
      expect(stored?.notes[0]?.body).toContain("Converted from informal log");

      const again = await convertLog(listRequest(), params("ilog-001"));
      expect(again.status).toBe(409);
      expect(await again.json()).toMatchObject({
        error: "Already converted",
        grievanceId: body.grievance.id,
      });
    });

    it("returns 403 when the grievance module is off for that tenant", async () => {
      const tenant = createOverlayUnion({
        name: "Comms Only Local",
        enabledModules: ["comms", "informalLog"],
        localNumber: "888",
      });
      const entry = await memoryInformalLogStore.create(
        {
          topic: "Cannot file",
          channel: "email",
          summary: "No grievance module",
          occurredAt: "2026-08-18T10:00:00.000Z",
        },
        {
          unionId: tenant.union.id,
          localId: tenant.locals![0]!.id,
          loggedById: "user-steward-888",
          loggedByName: "Steward 888",
        },
      );

      authMock.mockResolvedValue(
        session({
          id: "user-steward-888",
          unionId: tenant.union.id,
          localId: tenant.locals![0]!.id,
        }),
      );
      const res = await convertLog(listRequest(), params(entry.id));
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Grievance module not enabled" });
    });

    it("returns 404 when converting another union's log", async () => {
      const foreign = await memoryInformalLogStore.create(
        {
          topic: "Foreign convert",
          channel: "phone",
          summary: "Must 404",
          occurredAt: "2026-08-17T10:00:00.000Z",
        },
        {
          unionId: "union-other",
          localId: "local-1",
          loggedById: "user-other",
          loggedByName: "Other",
        },
      );
      authMock.mockResolvedValue(session({ roles: ["local_president"] }));
      expect((await convertLog(listRequest(), params(foreign.id))).status).toBe(
        404,
      );
    });
  });
});
