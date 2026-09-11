import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";
import type { PtoAccrualPolicy, PtoBalance, TimeShift, TimeWorker } from "@/types/time";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listBalances,
  POST as upsertBalance,
} from "@/app/api/time/pto/balances/route";
import {
  GET as listAccrual,
  PATCH as runAccrual,
  POST as upsertAccrual,
} from "@/app/api/time/pto/accrual-policies/route";
import {
  GET as listWorkers,
  POST as upsertWorker,
} from "@/app/api/time/workers/route";
import { POST as consentGps } from "@/app/api/time/workers/consent-gps/route";
import { PATCH as patchShift } from "@/app/api/time/shifts/[id]/route";
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

async function seedBalance(input: {
  workerId: string;
  unionId?: string;
  localId?: string;
  hours?: number;
  ptoType?: PtoBalance["ptoType"];
}): Promise<PtoBalance> {
  return memoryTimeStore.upsertPtoBalance(
    {
      workerId: input.workerId,
      ptoType: input.ptoType ?? "vacation",
      hours: input.hours ?? 24,
      mode: "set",
    },
    {
      unionId: input.unionId ?? "union-opseu",
      localId: input.localId ?? "local-243",
      updatedById: "user-president-243",
    },
  );
}

describe("time PTO balances, accrual, workers, and shift PATCH HTTP", () => {
  beforeEach(() => {
    resetTimeStore();
    resetTenantOverlayForTests();
    authMock.mockReset();
  });

  afterEach(() => {
    resetTimeStore();
    resetTenantOverlayForTests();
  });

  describe("GET/POST /api/time/pto/balances", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await listBalances()).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listBalances();
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("lets a steward list only their own balances and never another union", async () => {
      const own = await seedBalance({ workerId: "user-steward-243", hours: 16 });
      const coworker = await seedBalance({
        workerId: "user-other-worker",
        hours: 40,
      });
      const foreign = await seedBalance({
        unionId: "union-other",
        workerId: "user-steward-243",
        hours: 99,
      });

      authMock.mockResolvedValue(session());
      const res = await listBalances();
      expect(res.status).toBe(200);
      const body = (await res.json()) as { balances: Array<{ id: string }> };
      const ids = body.balances.map((row) => row.id);
      expect(ids).toContain(own.id);
      expect(ids).not.toContain(coworker.id);
      expect(ids).not.toContain(foreign.id);
    });

    it("lets a president list the local still excluding sister locals and other unions", async () => {
      const coworker = await seedBalance({
        workerId: "user-coworker-bal",
        hours: 8,
      });
      const sister = await seedBalance({
        localId: "local-560",
        workerId: "user-560",
        hours: 32,
      });
      const foreign = await seedBalance({
        unionId: "union-other",
        workerId: "user-other-union",
        hours: 48,
      });

      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const res = await listBalances();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        balances: Array<{ id: string; unionId: string; localId: string }>;
      };
      const ids = body.balances.map((row) => row.id);
      expect(ids).toContain(coworker.id);
      expect(ids).not.toContain(sister.id);
      expect(ids).not.toContain(foreign.id);
      expect(body.balances.every((row) => row.unionId === "union-opseu")).toBe(
        true,
      );
      expect(body.balances.every((row) => row.localId === "local-243")).toBe(
        true,
      );
    });

    it("forbids a steward upsert, rejects invalid bodies, then stamps session tenant", async () => {
      authMock.mockResolvedValue(session());
      expect(
        (
          await upsertBalance(
            jsonRequest({
              workerId: "user-steward-243",
              ptoType: "vacation",
              hours: 8,
              mode: "set",
            }),
          )
        ).status,
      ).toBe(403);

      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      expect((await upsertBalance(jsonRequest({}))).status).toBe(400);
      expect(
        (
          await upsertBalance(
            jsonRequest({
              workerId: "user-bal-http",
              ptoType: "sabbatical",
              hours: 8,
              mode: "set",
            }),
          )
        ).status,
      ).toBe(400);

      const created = await upsertBalance(
        jsonRequest({
          workerId: "user-bal-http",
          ptoType: "vacation",
          hours: 10,
          mode: "set",
          unionId: "union-other",
          localId: "local-evil",
        }),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as { balance: PtoBalance };
      expect(body.balance.unionId).toBe("union-opseu");
      expect(body.balance.localId).toBe("local-243");
      expect(body.balance.workerId).toBe("user-bal-http");
      expect(body.balance.hoursBalance).toBe(10);
      expect(body.balance.updatedById).toBe("user-president-243");

      const adjusted = await upsertBalance(
        jsonRequest({
          workerId: "user-bal-http",
          ptoType: "vacation",
          hours: 2,
          mode: "adjust",
        }),
      );
      expect(adjusted.status).toBe(201);
      const next = (await adjusted.json()) as { balance: PtoBalance };
      expect(next.balance.id).toBe(body.balance.id);
      expect(next.balance.hoursBalance).toBe(12);
    });
  });

  describe("GET/POST/PATCH /api/time/pto/accrual-policies", () => {
    it("returns 401/403 and forbids a steward from listing or mutating policies", async () => {
      authMock.mockResolvedValue(null);
      expect((await listAccrual()).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect((await listAccrual()).status).toBe(403);

      authMock.mockResolvedValue(session());
      expect((await listAccrual()).status).toBe(403);
      expect(
        (
          await upsertAccrual(
            jsonRequest({
              name: "Hijack",
              ptoType: "vacation",
              formulaType: "hours_worked",
              hoursWorkedRate: 0.05,
            }),
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await runAccrual(
            jsonRequest({
              from: "2034-01-01T00:00:00.000Z",
              to: "2034-01-31T00:00:00.000Z",
            }),
          )
        ).status,
      ).toBe(403);
    });

    it("stamps session tenant on create and does not list sister-local or other-union policies", async () => {
      const sister = await memoryTimeStore.upsertAccrualPolicy(
        {
          name: "Sister vacation",
          ptoType: "vacation",
          formulaType: "fixed_per_period",
          fixedHoursPerPeriod: 4,
          periodDays: 14,
        },
        { unionId: "union-opseu", localId: "local-560" },
      );
      const foreign = await memoryTimeStore.upsertAccrualPolicy(
        {
          name: "Foreign vacation",
          ptoType: "vacation",
          formulaType: "fixed_per_period",
          fixedHoursPerPeriod: 8,
          periodDays: 14,
        },
        { unionId: "union-other", localId: "local-1" },
      );

      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      const created = await upsertAccrual(
        jsonRequest({
          name: "Home vacation",
          ptoType: "vacation",
          formulaType: "hours_worked",
          hoursWorkedRate: 0.05,
          eligibleCategories: ["staff"],
          unionId: "union-other",
          localId: "local-evil",
        }),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as { policy: PtoAccrualPolicy };
      expect(body.policy.unionId).toBe("union-opseu");
      expect(body.policy.localId).toBe("local-243");
      expect(body.policy.name).toBe("Home vacation");

      const listed = await listAccrual();
      expect(listed.status).toBe(200);
      const listBody = (await listed.json()) as {
        policies: Array<{ id: string; unionId: string; localId: string }>;
      };
      const ids = listBody.policies.map((row) => row.id);
      expect(ids).toContain(body.policy.id);
      expect(ids).not.toContain(sister.id);
      expect(ids).not.toContain(foreign.id);
      expect(
        listBody.policies.every((row) => row.unionId === "union-opseu"),
      ).toBe(true);
      expect(listBody.policies.every((row) => row.localId === "local-243")).toBe(
        true,
      );
    });

    it("requires from/to then accrues only against the session local", async () => {
      const worker = await memoryTimeStore.upsertWorker(
        { displayName: "Accrual HTTP worker", userId: "user-accrual-http" },
        { unionId: "union-opseu", localId: "local-243" },
      );
      const homeEntry = await memoryTimeStore.createManualEntry(
        {
          category: "staff",
          jobCodeId: "code-staff-office",
          clockInAt: "2034-06-01T09:00:00.000Z",
          clockOutAt: "2034-06-01T19:00:00.000Z",
          workerId: worker.id,
          workerName: "Accrual HTTP worker",
          status: "submitted",
          entrySource: "manual_range",
        },
        {
          unionId: "union-opseu",
          localId: "local-243",
          jobCodeLabel: "Office / admin",
        },
      );
      await memoryTimeStore.updateEntryStatus(homeEntry.id, "approved");
      await memoryTimeStore.upsertAccrualPolicy(
        {
          name: "HTTP hours-worked",
          ptoType: "personal",
          formulaType: "hours_worked",
          hoursWorkedRate: 0.05,
          eligibleCategories: ["staff"],
        },
        { unionId: "union-opseu", localId: "local-243" },
      );
      const sisterWorker = await memoryTimeStore.upsertWorker(
        { displayName: "Sister accrual", userId: "user-560-accrual" },
        { unionId: "union-opseu", localId: "local-560" },
      );
      const sisterEntry = await memoryTimeStore.createManualEntry(
        {
          category: "staff",
          jobCodeId: "code-staff-office",
          clockInAt: "2034-06-02T09:00:00.000Z",
          clockOutAt: "2034-06-02T19:00:00.000Z",
          workerId: sisterWorker.id,
          workerName: "Sister accrual",
          status: "submitted",
          entrySource: "manual_range",
        },
        {
          unionId: "union-opseu",
          localId: "local-560",
          jobCodeLabel: "Office / admin",
        },
      );
      await memoryTimeStore.updateEntryStatus(sisterEntry.id, "approved");
      await memoryTimeStore.upsertAccrualPolicy(
        {
          name: "Sister hours-worked",
          ptoType: "personal",
          formulaType: "hours_worked",
          hoursWorkedRate: 0.05,
          eligibleCategories: ["staff"],
        },
        { unionId: "union-opseu", localId: "local-560" },
      );

      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      expect((await runAccrual(jsonRequest({}))).status).toBe(400);

      const ran = await runAccrual(
        jsonRequest({
          from: "2034-06-01T00:00:00.000Z",
          to: "2034-06-30T23:59:59.000Z",
        }),
      );
      expect(ran.status).toBe(200);
      const body = (await ran.json()) as {
        results: Array<{ workerId: string; hoursAccrued: number }>;
      };
      expect(body.results.map((row) => row.workerId)).toContain(worker.id);
      expect(body.results.map((row) => row.workerId)).not.toContain(
        sisterWorker.id,
      );
      const home = body.results.find(
        (row) => row.workerId === worker.id && row.hoursAccrued === 0.5,
      );
      expect(home?.hoursAccrued).toBe(0.5);

      const balances = await memoryTimeStore.listPtoBalances({
        unionId: "union-opseu",
        localId: "local-243",
        workerId: worker.id,
        ptoType: "personal",
      });
      expect(balances[0]?.hoursBalance).toBe(0.5);
    });
  });

  describe("GET/POST /api/time/workers and consent-gps", () => {
    it("does not list another union or sister local, and forbids a steward upsert", async () => {
      const home = await memoryTimeStore.upsertWorker(
        { displayName: "Home extra", userId: "user-home-extra" },
        { unionId: "union-opseu", localId: "local-243" },
      );
      const sister = await memoryTimeStore.upsertWorker(
        { displayName: "Sister roster", userId: "user-560-roster" },
        { unionId: "union-opseu", localId: "local-560" },
      );
      const foreign = await memoryTimeStore.upsertWorker(
        { displayName: "Foreign roster", userId: "user-other-roster" },
        { unionId: "union-other", localId: "local-1" },
      );

      authMock.mockResolvedValue(session());
      const listed = await listWorkers(
        new Request("http://localhost/api/time/workers"),
      );
      expect(listed.status).toBe(200);
      const body = (await listed.json()) as {
        workers: Array<{ id: string; unionId: string; localId: string }>;
      };
      const ids = body.workers.map((row) => row.id);
      expect(ids).toContain(home.id);
      expect(ids).not.toContain(sister.id);
      expect(ids).not.toContain(foreign.id);
      expect(body.workers.every((row) => row.unionId === "union-opseu")).toBe(
        true,
      );
      expect(body.workers.every((row) => row.localId === "local-243")).toBe(true);

      expect(
        (
          await upsertWorker(
            jsonRequest({ displayName: "Should not create" }),
          )
        ).status,
      ).toBe(403);
    });

    it("lets a president stamp session tenant and 403s when time is off", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      expect((await upsertWorker(jsonRequest({}))).status).toBe(400);

      const created = await upsertWorker(
        jsonRequest({
          displayName: "New roster worker",
          userId: "user-new-roster",
          unionId: "union-other",
          localId: "local-evil",
        }),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as { worker: TimeWorker };
      expect(body.worker.unionId).toBe("union-opseu");
      expect(body.worker.localId).toBe("local-243");
      expect(body.worker.displayName).toBe("New roster worker");
      expect(body.worker.userId).toBe("user-new-roster");

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
      const disabled = await listWorkers(
        new Request("http://localhost/api/time/workers"),
      );
      expect(disabled.status).toBe(403);
      expect(await disabled.json()).toEqual({ error: "Module not enabled" });
    });

    it("lets a steward consent GPS on their own roster row and 400s invalid JSON", async () => {
      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect(
        (await consentGps(jsonRequest({ consent: true }))).status,
      ).toBe(403);

      authMock.mockResolvedValue(session());
      const invalid = await consentGps({
        json: async () => {
          throw new Error("bad json");
        },
      } as Request);
      expect(invalid.status).toBe(400);

      const granted = await consentGps(jsonRequest({ consent: true }));
      expect(granted.status).toBe(200);
      const body = (await granted.json()) as { worker: TimeWorker };
      expect(body.worker.unionId).toBe("union-opseu");
      expect(body.worker.localId).toBe("local-243");
      expect(body.worker.userId).toBe("user-steward-243");
      expect(body.worker.gpsConsentAt).toBeTruthy();

      const revoked = await consentGps(jsonRequest({ consent: false }));
      expect(revoked.status).toBe(200);
      const next = (await revoked.json()) as { worker: TimeWorker };
      expect(next.worker.id).toBe(body.worker.id);
      expect(next.worker.gpsConsentAt).toBeFalsy();
    });
  });

  describe("PATCH /api/time/shifts/[id]", () => {
    it("404s another union even as platform_admin and 403s a steward mutate", async () => {
      const home = await memoryTimeStore.createShift(
        {
          label: "Picket morning",
          startsAt: "2034-09-01T09:00:00.000Z",
          endsAt: "2034-09-01T13:00:00.000Z",
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
          label: "Foreign desk",
          startsAt: "2034-09-02T09:00:00.000Z",
          endsAt: "2034-09-02T17:00:00.000Z",
          category: "staff",
          assignedWorkerIds: ["user-other"],
          status: "draft",
        },
        {
          unionId: "union-other",
          localId: "local-1",
          createdById: "user-other",
        },
      );

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const crossUnion = await patchShift(
        jsonRequest({ label: "Hijacked" }),
        params(foreign.id),
      );
      expect(crossUnion.status).toBe(404);
      expect((await memoryTimeStore.getShiftById(foreign.id))?.label).toBe(
        "Foreign desk",
      );

      authMock.mockResolvedValue(session());
      const steward = await patchShift(
        jsonRequest({ status: "cancelled" }),
        params(home.id),
      );
      expect(steward.status).toBe(403);
      expect((await memoryTimeStore.getShiftById(home.id))?.status).toBe(
        "published",
      );
    });

    it("lets a president patch the home local and 400s an inverted range", async () => {
      const home = await memoryTimeStore.createShift(
        {
          label: "Office desk",
          startsAt: "2034-09-03T09:00:00.000Z",
          endsAt: "2034-09-03T17:00:00.000Z",
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
      const sister = await memoryTimeStore.createShift(
        {
          label: "Sister desk",
          startsAt: "2034-09-04T09:00:00.000Z",
          endsAt: "2034-09-04T17:00:00.000Z",
          category: "staff",
          assignedWorkerIds: ["user-560"],
          status: "draft",
        },
        {
          unionId: "union-opseu",
          localId: "local-560",
          createdById: "user-560",
        },
      );

      authMock.mockResolvedValue(
        session({ id: "user-president-243", roles: ["local_president"] }),
      );
      expect(
        (
          await patchShift(
            jsonRequest({ status: "nope" }),
            params(home.id),
          )
        ).status,
      ).toBe(400);

      const inverted = await patchShift(
        jsonRequest({
          startsAt: "2034-09-03T18:00:00.000Z",
          endsAt: "2034-09-03T09:00:00.000Z",
        }),
        params(home.id),
      );
      expect(inverted.status).toBe(400);

      const publishable = await memoryTimeStore.createShift(
        {
          label: "Office desk",
          startsAt: "2034-09-05T09:00:00.000Z",
          endsAt: "2034-09-05T17:00:00.000Z",
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

      const sisterPatch = await patchShift(
        jsonRequest({ label: "Should not rename" }),
        params(sister.id),
      );
      expect(sisterPatch.status).toBe(404);
      expect((await memoryTimeStore.getShiftById(sister.id))?.label).toBe(
        "Sister desk",
      );

      const patched = await patchShift(
        jsonRequest({ label: "Published desk", status: "published" }),
        params(publishable.id),
      );
      expect(patched.status).toBe(200);
      const body = (await patched.json()) as { shift: TimeShift };
      expect(body.shift.unionId).toBe("union-opseu");
      expect(body.shift.localId).toBe("local-243");
      expect(body.shift.label).toBe("Published desk");
      expect(body.shift.status).toBe("published");
    });
  });
});
