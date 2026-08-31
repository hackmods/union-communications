import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";
import { HYBRID_SLICE_VERSION } from "@/lib/hybrid/types";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as exportSlice, POST as importSlice } from "@/app/api/hybrid/slice/route";
import { resetGrievanceMemoryForTests } from "@/lib/grievance/memory-adapter";
import { grievanceStore, resetGrievanceStore } from "@/lib/grievance/store";

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

function validSlice(overrides?: {
  unionId?: string;
  localId?: string;
  grievances?: unknown[];
}) {
  return {
    version: HYBRID_SLICE_VERSION,
    exportedAt: "2026-08-01T00:00:00.000Z",
    unionId: overrides?.unionId ?? "union-opseu",
    localId: overrides?.localId ?? "local-243",
    grievances: overrides?.grievances ?? [],
    bumpingCases: [],
    timeEntries: [],
  };
}

describe("hybrid slice API", () => {
  beforeEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
  });

  describe("GET /api/hybrid/slice", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await exportSlice()).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await exportSlice();
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("returns 400 when union or local is missing", async () => {
      authMock.mockResolvedValue(session({ unionId: null, localId: null }));
      const res = await exportSlice();
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Union and local context required for hybrid export",
      });
    });

    it("exports only the session local and never caches the plaintext slice", async () => {
      authMock.mockResolvedValue(session());
      const res = await exportSlice();
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toMatch(/no-store/);
      const body = (await res.json()) as {
        unionId: string;
        localId: string;
        grievances: Array<{ grievance: { id: string; unionId: string; localId: string } }>;
      };
      expect(body.unionId).toBe("union-opseu");
      expect(body.localId).toBe("local-243");
      expect(body.grievances.every((g) => g.grievance.unionId === "union-opseu")).toBe(
        true,
      );
      expect(body.grievances.every((g) => g.grievance.localId === "local-243")).toBe(
        true,
      );
      expect(body.grievances.map((g) => g.grievance.id)).not.toContain("grev-003");
    });
  });

  describe("POST /api/hybrid/slice", () => {
    it("blocks stewards, local_exec, and dual president+exec from import", async () => {
      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect((await importSlice(jsonRequest({ slice: validSlice() }))).status).toBe(
        403,
      );

      authMock.mockResolvedValue(session({ roles: ["local_exec"] }));
      expect((await importSlice(jsonRequest({ slice: validSlice() }))).status).toBe(
        403,
      );

      authMock.mockResolvedValue(
        session({ roles: ["local_president", "local_exec"] }),
      );
      const dual = await importSlice(jsonRequest({ slice: validSlice() }));
      expect(dual.status).toBe(403);
      expect(await dual.json()).toEqual({
        error: "Only local officers may import a data slice",
      });
    });

    it("rejects invalid JSON and invalid slices", async () => {
      authMock.mockResolvedValue(session());
      const badJson = await importSlice({
        json: async () => {
          throw new SyntaxError("Unexpected token");
        },
      } as Request);
      expect(badJson.status).toBe(400);

      const invalid = await importSlice(jsonRequest({ slice: { version: "nope" } }));
      expect(invalid.status).toBe(400);
      expect(await invalid.json()).toEqual({ error: "Invalid hybrid data slice" });
    });

    it("returns 403 when the slice tenant does not match the session local", async () => {
      authMock.mockResolvedValue(session());
      const mismatch = await importSlice(
        jsonRequest({ slice: validSlice({ unionId: "union-other", localId: "local-1" }) }),
      );
      expect(mismatch.status).toBe(403);
      expect(await mismatch.json()).toEqual({
        error: "Slice tenant does not match your local",
      });
    });

    it("returns 403 when a matching header still carries another tenant's grievance", async () => {
      authMock.mockResolvedValue(session());
      const poisoned = await importSlice(
        jsonRequest({
          slice: validSlice({
            grievances: [
              {
                grievance: {
                  id: "grev-poison",
                  unionId: "union-other",
                  localId: "local-243",
                  category: "Discipline",
                  status: "open",
                  currentStep: 1,
                  filedAt: "2026-08-01T00:00:00.000Z",
                  assignedStewardId: "user-x",
                  createdById: "user-x",
                  updatedAt: "2026-08-01T00:00:00.000Z",
                },
                events: [],
                notes: [],
              },
            ],
          }),
        }),
      );
      expect(poisoned.status).toBe(403);
      expect(await poisoned.json()).toEqual({
        error: "Grievance in slice belongs to another tenant",
      });
      expect(await grievanceStore.getById("grev-poison")).toBeNull();
    });
  });
});
