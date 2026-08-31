import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as previewHandoff, POST as completeHandoff } from "@/app/api/handoff/route";
import { resetGrievanceMemoryForTests } from "@/lib/grievance/memory-adapter";
import { grievanceStore, resetGrievanceStore } from "@/lib/grievance/store";

function session(input?: {
  id?: string;
  name?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-243",
      name: input?.name ?? "Local 243 President",
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

describe("handoff API routes", () => {
  beforeEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
  });

  describe("GET /api/handoff", () => {
    it("returns 401 without a session and 403 for stewards and members", async () => {
      authMock.mockResolvedValue(null);
      expect((await previewHandoff()).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect((await previewHandoff()).status).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const member = await previewHandoff();
      expect(member.status).toBe(403);
      expect(await member.json()).toEqual({ error: "Forbidden" });
    });

    it("blocks local_exec from initiating handoff", async () => {
      authMock.mockResolvedValue(session({ roles: ["local_exec"] }));
      expect((await previewHandoff()).status).toBe(403);
    });

    it("lists only open grievances and stewards for the session local", async () => {
      authMock.mockResolvedValue(session());
      const res = await previewHandoff();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        grievances: Array<{ id: string; unionId: string; localId: string; status: string }>;
        stewards: Array<{ id: string }>;
      };
      expect(body.grievances.every((g) => g.unionId === "union-opseu")).toBe(true);
      expect(body.grievances.every((g) => g.localId === "local-243")).toBe(true);
      expect(body.grievances.every((g) => g.status !== "resolved")).toBe(true);
      expect(body.grievances.map((g) => g.id)).not.toContain("grev-003");
      expect(body.stewards.map((s) => s.id)).toEqual(
        expect.arrayContaining(["user-steward-243", "user-steward-243-pt"]),
      );
    });
  });

  describe("POST /api/handoff", () => {
    it("returns 403 for a steward and 400 when required fields are missing", async () => {
      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect(
        (
          await completeHandoff(
            jsonRequest({
              toStewardId: "user-steward-243",
              toStewardName: "Local 243 Steward (FT)",
              grievanceIds: ["grev-001"],
            }),
          )
        ).status,
      ).toBe(403);

      authMock.mockResolvedValue(session());
      const missing = await completeHandoff(jsonRequest({ toStewardId: "x" }));
      expect(missing.status).toBe(400);
    });

    it("returns 400 when the session has no union or local", async () => {
      authMock.mockResolvedValue(session({ unionId: null, localId: null }));
      const res = await completeHandoff(
        jsonRequest({
          toStewardId: "user-steward-243",
          toStewardName: "Local 243 Steward (FT)",
          grievanceIds: ["grev-001"],
        }),
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Union and local required" });
    });

    it("reassigns matching local cases and skips foreign-union and other-local ids", async () => {
      const foreign = await grievanceStore.create(
        {
          category: "Discipline",
          filedAt: "2026-08-01T12:00:00.000Z",
        },
        {
          unionId: "union-other",
          localId: "local-1",
          createdById: "user-other",
          assignedStewardId: "user-other-steward",
        },
      );
      const otherLocalBefore = await grievanceStore.getById("grev-003");
      expect(otherLocalBefore?.grievance.assignedStewardId).toBe(
        "user-division-admin",
      );

      authMock.mockResolvedValue(session());
      const res = await completeHandoff(
        jsonRequest({
          toStewardId: "user-steward-243-pt",
          toStewardName: "Local 243 Steward (PT)",
          grievanceIds: ["grev-001", foreign.grievance.id, "grev-003"],
          notes: "Coverage while I am away",
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        reassigned: number;
        package: { grievanceIds: string[]; toStewardId: string };
      };
      expect(body.reassigned).toBe(1);
      expect(body.package.grievanceIds).toEqual(["grev-001"]);
      expect(body.package.toStewardId).toBe("user-steward-243-pt");

      const updated = await grievanceStore.getById("grev-001");
      expect(updated?.grievance.assignedStewardId).toBe("user-steward-243-pt");
      expect(updated?.notes.some((n) => n.body.includes("Officer handoff"))).toBe(
        true,
      );

      const stillForeign = await grievanceStore.getById(foreign.grievance.id);
      expect(stillForeign?.grievance.assignedStewardId).toBe("user-other-steward");
      const stillOtherLocal = await grievanceStore.getById("grev-003");
      expect(stillOtherLocal?.grievance.assignedStewardId).toBe(
        "user-division-admin",
      );
    });
  });
});
