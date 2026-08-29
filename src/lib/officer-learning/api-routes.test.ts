import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as getMe, PUT as putMe } from "@/app/api/officer-learning/me/route";
import {
  GET as getLocalSettings,
  PUT as putLocalSettings,
} from "@/app/api/officer-learning/local-settings/route";
import { GET as getLocalReport } from "@/app/api/officer-learning/local-report/route";
import { resetOfficerLearningMemoryForTests } from "./memory-adapter";
import { memoryOfficerLearningStore } from "./memory-adapter";
import { resetOfficerLearningStoreSingleton } from "./store";

function session(input?: {
  id?: string;
  unionId?: string;
  localId?: string;
  name?: string;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-1",
      name: input?.name ?? "Alex Steward",
      unionId: input?.unionId ?? "union-a",
      localId: input?.localId ?? "local-1",
      roles: input?.roles ?? (["local_steward"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function invalidJsonRequest(): Request {
  return {
    json: async () => {
      throw new SyntaxError("Unexpected token");
    },
  } as Request;
}

const validMeBody = {
  displayName: "Alex Steward",
  hubSyncEnabled: true,
  shareWithLocal: true,
  modules: {
    "module-1": {
      status: "completed" as const,
      scrollDepth: 100,
      quizPassed: true,
    },
  },
};

describe("officer learning API routes", () => {
  beforeEach(() => {
    resetOfficerLearningMemoryForTests();
    resetOfficerLearningStoreSingleton();
    authMock.mockReset();
  });

  describe("GET /api/officer-learning/me", () => {
    it("returns 401 when the session is missing tenant identity", async () => {
      authMock.mockResolvedValue(null);
      const res = await getMe();
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });

      authMock.mockResolvedValue({
        user: { id: "user-1", unionId: "union-a" },
      });
      expect((await getMe()).status).toBe(401);
    });

    it("returns an empty personal record when none is stored", async () => {
      authMock.mockResolvedValue(session());
      const res = await getMe();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        record: { userId: string; hubSyncEnabled: boolean; modules: unknown };
      };
      expect(body.record.userId).toBe("user-1");
      expect(body.record.hubSyncEnabled).toBe(false);
      expect(body.record.modules).toEqual({});
    });
  });

  describe("PUT /api/officer-learning/me", () => {
    it("rejects unauthenticated, invalid JSON, and schema-invalid bodies", async () => {
      authMock.mockResolvedValue(null);
      expect((await putMe(jsonRequest(validMeBody))).status).toBe(401);

      authMock.mockResolvedValue(session());
      expect((await putMe(invalidJsonRequest())).status).toBe(400);

      const invalid = await putMe(
        jsonRequest({ ...validMeBody, hubSyncEnabled: false }),
      );
      expect(invalid.status).toBe(400);
      expect(await invalid.json()).toMatchObject({ error: "Validation failed" });
    });

    it("persists under the session tenant and ignores forged unionId in the body", async () => {
      authMock.mockResolvedValue(session());
      const res = await putMe(
        jsonRequest({
          ...validMeBody,
          unionId: "other-union",
          userId: "attacker",
        }),
      );
      expect(res.status).toBe(400);

      const ok = await putMe(jsonRequest(validMeBody));
      expect(ok.status).toBe(200);

      const stored = await memoryOfficerLearningStore.getUser(
        "union-a",
        "user-1",
      );
      expect(stored?.unionId).toBe("union-a");
      expect(stored?.localId).toBe("local-1");
      expect(stored?.modules["module-1"]?.quizPassed).toBe(true);
      expect(
        await memoryOfficerLearningStore.getUser("other-union", "user-1"),
      ).toBeNull();
    });
  });

  describe("local settings and report", () => {
    it("returns 403 when a steward tries to manage or read the local report", async () => {
      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect((await getLocalSettings()).status).toBe(403);
      expect((await putLocalSettings(jsonRequest({ reportingEnabled: true }))).status).toBe(
        403,
      );
      expect((await getLocalReport()).status).toBe(403);
    });

    it("lets a president enable reporting and only lists their union and local", async () => {
      await memoryOfficerLearningStore.upsertUser({
        userId: "other-union-user",
        unionId: "union-b",
        localId: "local-1",
        displayName: "Other union",
        hubSyncEnabled: true,
        shareWithLocal: true,
        modules: {
          "module-1": {
            status: "completed",
            scrollDepth: 100,
            quizPassed: true,
          },
        },
      });
      await memoryOfficerLearningStore.saveLocalSettings({
        unionId: "union-b",
        localId: "local-1",
        reportingEnabled: true,
        updatedById: "pres-b",
        updatedAt: new Date().toISOString(),
      });

      authMock.mockResolvedValue(
        session({ id: "pres-1", roles: ["local_president"] }),
      );

      const beforeEnable = await getLocalSettings();
      expect(beforeEnable.status).toBe(200);
      expect(
        ((await beforeEnable.json()) as { settings: { reportingEnabled: boolean } })
          .settings.reportingEnabled,
      ).toBe(false);

      const put = await putLocalSettings(jsonRequest({ reportingEnabled: true }));
      expect(put.status).toBe(200);

      await memoryOfficerLearningStore.upsertUser({
        userId: "user-1",
        unionId: "union-a",
        localId: "local-1",
        displayName: "Alex Steward",
        hubSyncEnabled: true,
        shareWithLocal: true,
        modules: {
          "module-1": {
            status: "completed",
            scrollDepth: 100,
            quizPassed: true,
          },
        },
      });

      const report = await getLocalReport();
      expect(report.status).toBe(200);
      const body = (await report.json()) as {
        rows: Array<{ userId: string; displayName: string }>;
      };
      expect(body.rows).toHaveLength(1);
      expect(body.rows[0].userId).toBe("user-1");
      expect(body.rows.map((row) => row.displayName)).not.toContain("Other union");
    });

    it("returns 401 for local settings without a session", async () => {
      authMock.mockResolvedValue(null);
      expect((await getLocalSettings()).status).toBe(401);
      expect((await getLocalReport()).status).toBe(401);
    });
  });
});
