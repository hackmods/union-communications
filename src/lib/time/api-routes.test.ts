import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";
import type { TimeEntry } from "@/types/time";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as listEntries } from "@/app/api/time/entries/route";
import { POST as clockIn } from "@/app/api/time/entries/clock-in/route";
import { POST as clockOut } from "@/app/api/time/entries/clock-out/route";
import { POST as bulkApprove } from "@/app/api/time/entries/bulk-approve/route";
import { memoryTimeStore } from "@/lib/time/memory-adapter";
import { resetTimeStore } from "@/lib/time/store";
import {
  createOverlayUnion,
  resetTenantOverlayForTests,
} from "@/lib/tenant/overlay";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  name?: string;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-steward-243",
      name: input?.name ?? "Local 243 Steward",
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

async function seedSubmitted(input: {
  unionId?: string;
  localId?: string;
  workerId: string;
  clockInAt: string;
  clockOutAt: string;
}): Promise<TimeEntry> {
  return memoryTimeStore.createManualEntry(
    {
      category: "release",
      jobCodeId: "code-release-grievance",
      clockInAt: input.clockInAt,
      clockOutAt: input.clockOutAt,
      workerId: input.workerId,
      workerName: input.workerId,
      status: "submitted",
      entrySource: "manual_range",
    },
    {
      unionId: input.unionId ?? "union-opseu",
      localId: input.localId ?? "local-243",
      jobCodeLabel: "Grievance handling",
    },
  );
}

describe("time entry HTTP routes", () => {
  beforeEach(() => {
    resetTimeStore();
    resetTenantOverlayForTests();
    authMock.mockReset();
  });

  afterEach(() => {
    resetTimeStore();
    resetTenantOverlayForTests();
  });

  describe("GET /api/time/entries", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await listEntries()).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listEntries();
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("lets a steward list only their own local entries and never another union", async () => {
      const own = await seedSubmitted({
        workerId: "user-steward-243",
        clockInAt: "2031-01-01T10:00:00.000Z",
        clockOutAt: "2031-01-01T12:00:00.000Z",
      });
      const coworker = await seedSubmitted({
        workerId: "user-other-worker",
        clockInAt: "2031-01-02T10:00:00.000Z",
        clockOutAt: "2031-01-02T12:00:00.000Z",
      });
      const foreign = await seedSubmitted({
        unionId: "union-other",
        localId: "local-243",
        workerId: "user-steward-243",
        clockInAt: "2031-01-03T10:00:00.000Z",
        clockOutAt: "2031-01-03T12:00:00.000Z",
      });

      authMock.mockResolvedValue(session());
      const res = await listEntries();
      expect(res.status).toBe(200);
      const body = (await res.json()) as { entries: Array<{ id: string }> };
      const ids = body.entries.map((e) => e.id);
      expect(ids).toContain(own.id);
      expect(ids).not.toContain(coworker.id);
      expect(ids).not.toContain(foreign.id);
    });

    it("lets a president list every worker on their local still excluding other unions and sister locals", async () => {
      const coworker = await seedSubmitted({
        workerId: "user-other-worker",
        clockInAt: "2031-02-01T10:00:00.000Z",
        clockOutAt: "2031-02-01T12:00:00.000Z",
      });
      const sister = await seedSubmitted({
        localId: "local-560",
        workerId: "user-560",
        clockInAt: "2031-02-02T10:00:00.000Z",
        clockOutAt: "2031-02-02T12:00:00.000Z",
      });
      const foreign = await seedSubmitted({
        unionId: "union-other",
        workerId: "user-other-union",
        clockInAt: "2031-02-03T10:00:00.000Z",
        clockOutAt: "2031-02-03T12:00:00.000Z",
      });

      authMock.mockResolvedValue(
        session({
          id: "user-president-243",
          roles: ["local_president"],
        }),
      );
      const res = await listEntries();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        entries: Array<{ id: string; unionId: string; localId: string }>;
      };
      const ids = body.entries.map((e) => e.id);
      expect(ids).toContain(coworker.id);
      expect(ids).not.toContain(sister.id);
      expect(ids).not.toContain(foreign.id);
      expect(body.entries.every((e) => e.unionId === "union-opseu")).toBe(true);
      expect(body.entries.every((e) => e.localId === "local-243")).toBe(true);
    });
  });

  describe("POST /api/time/entries/clock-in", () => {
    it("returns 401/403 and stamps session tenant ids on success", async () => {
      authMock.mockResolvedValue(null);
      expect(
        (
          await clockIn(
            jsonRequest({
              category: "staff",
              jobCodeId: "code-staff-office",
            }),
          )
        ).status,
      ).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect(
        (
          await clockIn(
            jsonRequest({
              category: "staff",
              jobCodeId: "code-staff-office",
            }),
          )
        ).status,
      ).toBe(403);

      authMock.mockResolvedValue(
        session({ id: "user-clock-in-http", name: "Clock Tester" }),
      );
      const res = await clockIn(
        jsonRequest({
          category: "staff",
          jobCodeId: "code-staff-office",
          notes: "Desk",
        }),
      );
      expect(res.status).toBe(201);
      const body = (await res.json()) as { entry: TimeEntry };
      expect(body.entry.unionId).toBe("union-opseu");
      expect(body.entry.localId).toBe("local-243");
      expect(body.entry.workerId).toBe("user-clock-in-http");
      expect(body.entry.status).toBe("active");
    });

    it("rejects missing fields, unknown job codes, and other-union job codes", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-clock-in-validate" }),
      );
      expect((await clockIn(jsonRequest({}))).status).toBe(400);
      expect(
        (await clockIn(jsonRequest({ category: "staff" }))).status,
      ).toBe(400);
      expect(
        (
          await clockIn(
            jsonRequest({ category: "not-a-category", jobCodeId: "x" }),
          )
        ).status,
      ).toBe(400);

      const missing = await clockIn(
        jsonRequest({
          category: "staff",
          jobCodeId: "code-does-not-exist",
        }),
      );
      expect(missing.status).toBe(404);

      const tenant = createOverlayUnion({
        name: "Time Enabled Other",
        enabledModules: ["comms", "time"],
        localNumber: "888",
      });
      const foreignCode = await memoryTimeStore.createJobCode(
        {
          code: "OTHER",
          label: "Other union office",
          category: "staff",
        },
        { unionId: tenant.union.id, localId: tenant.locals![0]!.id },
      );
      const cross = await clockIn(
        jsonRequest({
          category: "staff",
          jobCodeId: foreignCode.id,
        }),
      );
      expect(cross.status).toBe(404);
    });

    it("returns 403 when the time module is off and 409 when already clocked in", async () => {
      const tenant = createOverlayUnion({
        name: "No Time Union",
        enabledModules: ["comms", "grievance"],
        localNumber: "321",
      });
      authMock.mockResolvedValue(
        session({
          id: "user-no-time",
          unionId: tenant.union.id,
          localId: tenant.locals![0]!.id,
          roles: ["local_president"],
        }),
      );
      const disabled = await clockIn(
        jsonRequest({
          category: "staff",
          jobCodeId: "code-staff-office",
        }),
      );
      expect(disabled.status).toBe(403);
      expect(await disabled.json()).toEqual({ error: "Module not enabled" });

      authMock.mockResolvedValue(session({ id: "user-double-clock" }));
      const first = await clockIn(
        jsonRequest({
          category: "staff",
          jobCodeId: "code-staff-office",
        }),
      );
      expect(first.status).toBe(201);
      const second = await clockIn(
        jsonRequest({
          category: "staff",
          jobCodeId: "code-staff-office",
        }),
      );
      expect(second.status).toBe(409);
    });

    it("blocks clock-in outside a geofence in block mode", async () => {
      await memoryTimeStore.upsertSite(
        {
          name: "Hall",
          lat: 43.6532,
          lng: -79.3832,
          geofenceRadiusM: 50,
          geofenceMode: "block",
          active: true,
        },
        { unionId: "union-opseu", localId: "local-243" },
      );
      authMock.mockResolvedValue(session({ id: "user-geo-clock" }));
      const res = await clockIn(
        jsonRequest({
          category: "staff",
          jobCodeId: "code-staff-office",
          clockInGps: {
            lat: 45.4215,
            lng: -75.6972,
            capturedAt: "2031-03-01T10:00:00.000Z",
          },
        }),
      );
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({
        error: "Clock-in blocked: outside authorized location",
      });
    });
  });

  describe("POST /api/time/entries/clock-out", () => {
    it("returns 404 for another union's entry and 403 when clocking out someone else", async () => {
      authMock.mockResolvedValue(null);
      expect((await clockOut(jsonRequest({ entryId: "x" }))).status).toBe(401);

      authMock.mockResolvedValue(session({ id: "user-clock-out-own" }));
      const ownIn = await clockIn(
        jsonRequest({
          category: "staff",
          jobCodeId: "code-staff-office",
        }),
      );
      const own = ((await ownIn.json()) as { entry: TimeEntry }).entry;

      const foreign = await memoryTimeStore.clockIn(
        { category: "staff", jobCodeId: "code-staff-office" },
        {
          unionId: "union-other",
          localId: "local-243",
          workerId: "user-clock-out-own",
          workerName: "Same person other union",
          jobCodeLabel: "Office / admin",
        },
      );

      const missing = await clockOut(jsonRequest({}));
      expect(missing.status).toBe(400);

      const hidden = await clockOut(jsonRequest({ entryId: foreign.id }));
      expect(hidden.status).toBe(404);

      authMock.mockResolvedValue(
        session({
          id: "user-president-243",
          roles: ["local_president"],
        }),
      );
      const notOwn = await clockOut(jsonRequest({ entryId: own.id }));
      expect(notOwn.status).toBe(403);

      authMock.mockResolvedValue(session({ id: "user-clock-out-own" }));
      const ok = await clockOut(jsonRequest({ entryId: own.id }));
      expect(ok.status).toBe(200);
      const body = (await ok.json()) as { entry: TimeEntry };
      expect(body.entry.status).toBe("completed");
      expect(body.entry.clockOutAt).toBeTruthy();
    });
  });

  describe("POST /api/time/entries/bulk-approve", () => {
    it("returns 401/403, 400 for empty ids, and skips other-union plus steward-forbidden rows", async () => {
      authMock.mockResolvedValue(null);
      expect((await bulkApprove(jsonRequest({ ids: ["a"] }))).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect((await bulkApprove(jsonRequest({ ids: ["a"] }))).status).toBe(403);

      authMock.mockResolvedValue(
        session({
          id: "user-president-243",
          roles: ["local_president"],
        }),
      );
      expect((await bulkApprove(jsonRequest({ ids: [] }))).status).toBe(400);
      expect((await bulkApprove(jsonRequest({}))).status).toBe(400);

      const own = await seedSubmitted({
        workerId: "user-bulk-own",
        clockInAt: "2031-04-01T10:00:00.000Z",
        clockOutAt: "2031-04-01T12:00:00.000Z",
      });
      const foreign = await seedSubmitted({
        unionId: "union-other",
        workerId: "user-bulk-foreign",
        clockInAt: "2031-04-02T10:00:00.000Z",
        clockOutAt: "2031-04-02T12:00:00.000Z",
      });
      const sister = await seedSubmitted({
        localId: "local-560",
        workerId: "user-bulk-560",
        clockInAt: "2031-04-03T10:00:00.000Z",
        clockOutAt: "2031-04-03T12:00:00.000Z",
      });

      const approved = await bulkApprove(
        jsonRequest({ ids: [own.id, foreign.id, sister.id, "missing-id"] }),
      );
      expect(approved.status).toBe(200);
      const body = (await approved.json()) as {
        approved: string[];
        skipped: Array<{ id: string; reason: string }>;
      };
      expect(body.approved).toEqual([own.id]);
      expect(body.skipped).toEqual(
        expect.arrayContaining([
          { id: foreign.id, reason: "forbidden" },
          { id: sister.id, reason: "forbidden" },
          { id: "missing-id", reason: "not_found" },
        ]),
      );

      authMock.mockResolvedValue(session());
      const stewardTarget = await seedSubmitted({
        workerId: "user-bulk-steward-target",
        clockInAt: "2031-04-04T10:00:00.000Z",
        clockOutAt: "2031-04-04T12:00:00.000Z",
      });
      const steward = await bulkApprove(
        jsonRequest({ ids: [stewardTarget.id] }),
      );
      expect(steward.status).toBe(200);
      expect(await steward.json()).toMatchObject({
        approved: [],
        skipped: [{ id: stewardTarget.id, reason: "forbidden" }],
      });
    });
  });
});
