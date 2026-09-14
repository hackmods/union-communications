import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";
import type { PtoRequest, TimeShift, WorkSite } from "@/types/time";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listPto,
  POST as createPto,
} from "@/app/api/time/pto/route";
import { PATCH as patchPto } from "@/app/api/time/pto/[id]/route";
import {
  GET as listSites,
  POST as upsertSite,
} from "@/app/api/time/sites/route";
import {
  GET as listShifts,
  POST as createShift,
} from "@/app/api/time/shifts/route";
import { GET as exportTime } from "@/app/api/time/export/route";
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

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const ptoWindow = {
  ptoType: "vacation" as const,
  startsAt: "2033-08-01T09:00:00.000Z",
  endsAt: "2033-08-02T17:00:00.000Z",
  hoursRequested: 8,
};

async function seedPto(input: {
  workerId: string;
  unionId?: string;
  localId?: string;
  startsAt?: string;
  endsAt?: string;
  status?: "draft" | "submitted";
}): Promise<PtoRequest> {
  return memoryTimeStore.createPtoRequest(
    {
      workerId: input.workerId,
      workerName: input.workerId,
      ptoType: "vacation",
      startsAt: input.startsAt ?? "2033-09-01T09:00:00.000Z",
      endsAt: input.endsAt ?? "2033-09-02T17:00:00.000Z",
      hoursRequested: 8,
      status: input.status ?? "submitted",
    },
    {
      unionId: input.unionId ?? "union-opseu",
      localId: input.localId ?? "local-243",
      requestedById: input.workerId,
    },
  );
}

describe("time PTO, sites, shifts, and export HTTP routes", () => {
  beforeEach(() => {
    resetTimeStore();
    resetTenantOverlayForTests();
    authMock.mockReset();
  });

  afterEach(() => {
    resetTimeStore();
    resetTenantOverlayForTests();
  });

  describe("GET/POST /api/time/pto", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await listPto(new Request("http://localhost/api/time/pto"))).status).toBe(
        401,
      );

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listPto(
        new Request("http://localhost/api/time/pto"),
      );
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("lets a steward list only their own requests and never another union", async () => {
      const own = await seedPto({
        workerId: "user-steward-243",
        startsAt: "2033-01-01T09:00:00.000Z",
        endsAt: "2033-01-02T17:00:00.000Z",
      });
      const coworker = await seedPto({
        workerId: "user-other-worker",
        startsAt: "2033-01-03T09:00:00.000Z",
        endsAt: "2033-01-04T17:00:00.000Z",
      });
      const foreign = await seedPto({
        unionId: "union-other",
        workerId: "user-steward-243",
        startsAt: "2033-01-05T09:00:00.000Z",
        endsAt: "2033-01-06T17:00:00.000Z",
      });

      authMock.mockResolvedValue(session());
      const res = await listPto(new Request("http://localhost/api/time/pto"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { requests: Array<{ id: string }> };
      const ids = body.requests.map((r) => r.id);
      expect(ids).toContain(own.id);
      expect(ids).not.toContain(coworker.id);
      expect(ids).not.toContain(foreign.id);
    });

    it("lets a president list the local still excluding sister locals and other unions", async () => {
      const coworker = await seedPto({
        workerId: "user-other-worker",
        startsAt: "2033-02-01T09:00:00.000Z",
        endsAt: "2033-02-02T17:00:00.000Z",
      });
      const sister = await seedPto({
        localId: "local-560",
        workerId: "user-560",
        startsAt: "2033-02-03T09:00:00.000Z",
        endsAt: "2033-02-04T17:00:00.000Z",
      });
      const foreign = await seedPto({
        unionId: "union-other",
        workerId: "user-other-union",
        startsAt: "2033-02-05T09:00:00.000Z",
        endsAt: "2033-02-06T17:00:00.000Z",
      });

      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const res = await listPto(new Request("http://localhost/api/time/pto"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        requests: Array<{ id: string; unionId: string; localId: string }>;
      };
      const ids = body.requests.map((r) => r.id);
      expect(ids).toContain(coworker.id);
      expect(ids).not.toContain(sister.id);
      expect(ids).not.toContain(foreign.id);
      expect(body.requests.every((r) => r.unionId === "union-opseu")).toBe(true);
      expect(body.requests.every((r) => r.localId === "local-243")).toBe(true);
    });

    it("rejects invalid bodies then stamps session worker, ignoring a forged workerId", async () => {
      authMock.mockResolvedValue(session({ id: "user-pto-create" }));
      expect((await createPto(jsonRequest({}))).status).toBe(400);
      expect(
        (
          await createPto(
            jsonRequest({
              ...ptoWindow,
              ptoType: "sabbatical",
            }),
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await createPto(
            jsonRequest({
              ptoType: "vacation",
              startsAt: "2033-08-05T09:00:00.000Z",
              endsAt: "2033-08-01T09:00:00.000Z",
            }),
          )
        ).status,
      ).toBe(400);

      const created = await createPto(
        jsonRequest({
          ...ptoWindow,
          workerId: "user-someone-else",
          workerName: "Forged",
          unionId: "union-other",
          localId: "local-evil",
        }),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as { request: PtoRequest };
      expect(body.request.unionId).toBe("union-opseu");
      expect(body.request.localId).toBe("local-243");
      expect(body.request.workerId).toBe("user-pto-create");
      expect(body.request.workerName).toBe("Local 243 Steward");
      expect(body.request.requestedById).toBe("user-pto-create");
    });
  });

  describe("PATCH /api/time/pto/[id]", () => {
    it("404s another union even as platform_admin and 403s a steward approve", async () => {
      const foreign = await seedPto({
        unionId: "union-other",
        workerId: "user-x",
        startsAt: "2033-03-01T09:00:00.000Z",
        endsAt: "2033-03-02T17:00:00.000Z",
      });
      const own = await seedPto({
        workerId: "user-steward-243",
        startsAt: "2033-03-03T09:00:00.000Z",
        endsAt: "2033-03-04T17:00:00.000Z",
      });

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const crossUnion = await patchPto(
        jsonRequest({ status: "approved" }),
        params(foreign.id),
      );
      expect(crossUnion.status).toBe(404);

      authMock.mockResolvedValue(session());
      const stewardApprove = await patchPto(
        jsonRequest({ status: "approved" }),
        params(own.id),
      );
      expect(stewardApprove.status).toBe(403);
      expect(await stewardApprove.json()).toEqual({ error: "Forbidden" });
    });

    it("lets a steward cancel their own request and a president approve it", async () => {
      const own = await seedPto({
        workerId: "user-steward-243",
        startsAt: "2033-04-01T09:00:00.000Z",
        endsAt: "2033-04-02T17:00:00.000Z",
      });
      authMock.mockResolvedValue(session());
      const cancelled = await patchPto(
        jsonRequest({ status: "cancelled" }),
        params(own.id),
      );
      expect(cancelled.status).toBe(200);
      expect(((await cancelled.json()) as { request: PtoRequest }).request.status).toBe(
        "cancelled",
      );

      const submitted = await seedPto({
        workerId: "user-steward-243",
        startsAt: "2033-04-05T09:00:00.000Z",
        endsAt: "2033-04-06T17:00:00.000Z",
      });
      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const approved = await patchPto(
        jsonRequest({ status: "approved" }),
        params(submitted.id),
      );
      expect(approved.status).toBe(200);
      const body = (await approved.json()) as { request: PtoRequest };
      expect(body.request.status).toBe("approved");
      expect(body.request.approvedById).toBe("user-president-243");
    });
  });

  describe("GET/POST /api/time/sites", () => {
    it("forbids members and stewards from upserting, then stamps session tenant on create", async () => {
      const siteBody = {
        name: "Hall",
        lat: 43.65,
        lng: -79.38,
        geofenceRadiusM: 250,
        geofenceMode: "warn",
      };

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect((await listSites()).status).toBe(403);

      authMock.mockResolvedValue(session());
      expect((await listSites()).status).toBe(200);
      expect((await upsertSite(jsonRequest(siteBody))).status).toBe(403);

      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      expect((await upsertSite(jsonRequest({ name: "Hall" }))).status).toBe(400);
      expect(
        (
          await upsertSite(
            jsonRequest({ ...siteBody, geofenceMode: "teleport" }),
          )
        ).status,
      ).toBe(400);

      const created = await upsertSite(
        jsonRequest({
          ...siteBody,
          unionId: "union-other",
          localId: "local-evil",
        }),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as { site: WorkSite };
      expect(body.site.unionId).toBe("union-opseu");
      expect(body.site.localId).toBe("local-243");
      expect(body.site.name).toBe("Hall");
      expect(body.site.geofenceMode).toBe("warn");
    });

    it("lists only the session local's sites", async () => {
      await memoryTimeStore.upsertSite(
        {
          name: "Home hall",
          lat: 43.65,
          lng: -79.38,
          geofenceRadiusM: 100,
          geofenceMode: "off",
        },
        { unionId: "union-opseu", localId: "local-243" },
      );
      await memoryTimeStore.upsertSite(
        {
          name: "Sister hall",
          lat: 44.0,
          lng: -79.0,
          geofenceRadiusM: 100,
          geofenceMode: "off",
        },
        { unionId: "union-opseu", localId: "local-560" },
      );
      await memoryTimeStore.upsertSite(
        {
          name: "Other union",
          lat: 45.0,
          lng: -75.0,
          geofenceRadiusM: 100,
          geofenceMode: "block",
        },
        { unionId: "union-other", localId: "local-243" },
      );

      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const res = await listSites();
      expect(res.status).toBe(200);
      const names = ((await res.json()) as { sites: WorkSite[] }).sites.map(
        (s) => s.name,
      );
      expect(names).toContain("Home hall");
      expect(names).not.toContain("Sister hall");
      expect(names).not.toContain("Other union");
    });
  });

  describe("GET/POST /api/time/shifts", () => {
    it("hides draft shifts from a steward unless published and assigned, and stamps tenant on create", async () => {
      const draft = await memoryTimeStore.createShift(
        {
          label: "Draft desk",
          startsAt: "2033-05-01T09:00:00.000Z",
          endsAt: "2033-05-01T17:00:00.000Z",
          category: "staff",
          assignedWorkerIds: ["user-steward-243"],
          status: "draft",
        },
        {
          unionId: "union-opseu",
          localId: "local-243",
          createdById: "user-president-243",
        },
      );
      const published = await memoryTimeStore.createShift(
        {
          label: "Picket",
          startsAt: "2033-05-02T09:00:00.000Z",
          endsAt: "2033-05-02T17:00:00.000Z",
          category: "action",
          assignedWorkerIds: ["user-steward-243"],
          status: "published",
        },
        {
          unionId: "union-opseu",
          localId: "local-243",
          createdById: "user-president-243",
        },
      );
      const foreign = await memoryTimeStore.createShift(
        {
          label: "Other union",
          startsAt: "2033-05-03T09:00:00.000Z",
          endsAt: "2033-05-03T17:00:00.000Z",
          category: "staff",
          assignedWorkerIds: ["user-steward-243"],
          status: "published",
        },
        {
          unionId: "union-other",
          localId: "local-243",
          createdById: "user-x",
        },
      );

      authMock.mockResolvedValue(session());
      const listed = await listShifts(
        new Request("http://localhost/api/time/shifts"),
      );
      expect(listed.status).toBe(200);
      const body = (await listed.json()) as { shifts: Array<{ id: string }> };
      const ids = body.shifts.map((s) => s.id);
      expect(ids).toContain(published.id);
      expect(ids).not.toContain(draft.id);
      expect(ids).not.toContain(foreign.id);

      expect(
        (
          await createShift(
            jsonRequest({
              label: "Nope",
              startsAt: "2033-05-10T09:00:00.000Z",
              endsAt: "2033-05-10T17:00:00.000Z",
              category: "staff",
            }),
          )
        ).status,
      ).toBe(403);

      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const created = await createShift(
        jsonRequest({
          label: "Board night",
          startsAt: "2033-05-11T18:00:00.000Z",
          endsAt: "2033-05-11T21:00:00.000Z",
          category: "volunteer",
          unionId: "union-other",
          assignedWorkerIds: ["user-steward-243"],
        }),
      );
      expect(created.status).toBe(201);
      const createdBody = (await created.json()) as { shift: TimeShift };
      expect(createdBody.shift.unionId).toBe("union-opseu");
      expect(createdBody.shift.localId).toBe("local-243");
      expect(createdBody.shift.status).toBe("draft");
    });
  });

  describe("GET /api/time/export", () => {
    it("forbids stewards, then CSV-exports only the president's local", async () => {
      await memoryTimeStore.createManualEntry(
        {
          category: "release",
          jobCodeId: "code-release-grievance",
          clockInAt: "2033-06-01T10:00:00.000Z",
          clockOutAt: "2033-06-01T12:00:00.000Z",
          workerId: "user-local",
          workerName: "LocalWorker",
          status: "completed",
          entrySource: "manual_range",
        },
        {
          unionId: "union-opseu",
          localId: "local-243",
          jobCodeLabel: "Grievance handling",
        },
      );
      await memoryTimeStore.createManualEntry(
        {
          category: "release",
          jobCodeId: "code-release-grievance",
          clockInAt: "2033-06-02T10:00:00.000Z",
          clockOutAt: "2033-06-02T12:00:00.000Z",
          workerId: "user-560",
          workerName: "SisterWorker",
          status: "completed",
          entrySource: "manual_range",
        },
        {
          unionId: "union-opseu",
          localId: "local-560",
          jobCodeLabel: "Grievance handling",
        },
      );
      await memoryTimeStore.createManualEntry(
        {
          category: "release",
          jobCodeId: "code-release-grievance",
          clockInAt: "2033-06-03T10:00:00.000Z",
          clockOutAt: "2033-06-03T12:00:00.000Z",
          workerId: "user-other",
          workerName: "ForeignWorker",
          status: "completed",
          entrySource: "manual_range",
        },
        {
          unionId: "union-other",
          localId: "local-243",
          jobCodeLabel: "Grievance handling",
        },
      );

      authMock.mockResolvedValue(session());
      expect(
        (await exportTime(new Request("http://localhost/api/time/export"))).status,
      ).toBe(403);

      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const res = await exportTime(
        new Request("http://localhost/api/time/export?format=csv"),
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/csv");
      const csv = await res.text();
      expect(csv).toContain("LocalWorker");
      expect(csv).not.toContain("SisterWorker");
      expect(csv).not.toContain("ForeignWorker");
    });

    it("returns 403 when the time module is off", async () => {
      const overlay = createOverlayUnion({
        name: "No Time Local",
        enabledModules: ["comms", "grievance"],
        localNumber: "888",
      });
      authMock.mockResolvedValue(
        session({
          id: "user-president-overlay",
          unionId: overlay.union.id,
          localId: overlay.locals?.[0]?.id ?? "local-x",
          roles: ["local_president"],
        }),
      );
      const res = await exportTime(
        new Request("http://localhost/api/time/export"),
      );
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Module not enabled" });
    });
  });
});
