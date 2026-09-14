import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";
import { formatUtcDateKey } from "@/lib/checkins/periods";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listCheckins,
  POST as createCheckin,
} from "@/app/api/checkins/route";
import { PATCH as patchCheckin } from "@/app/api/checkins/[id]/route";
import {
  GET as listAnswers,
  POST as postAnswer,
} from "@/app/api/checkins/[id]/answers/route";
import {
  memoryCheckinsStore,
  resetCheckinsMemoryForTests,
} from "./memory-adapter";
import { resetCheckinsStore } from "./store";
import {
  createOverlayUnion,
  resetTenantOverlayForTests,
} from "@/lib/tenant/overlay";

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
  question: "What did you move this week?",
  cadence: "daily" as const,
};

describe("checkins API routes", () => {
  beforeEach(() => {
    resetCheckinsMemoryForTests();
    resetCheckinsStore();
    resetTenantOverlayForTests();
    authMock.mockReset();
  });

  afterEach(() => {
    resetCheckinsMemoryForTests();
    resetCheckinsStore();
    resetTenantOverlayForTests();
  });

  describe("GET/POST /api/checkins", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await listCheckins()).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listCheckins();
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("does not list another union or another local for a president", async () => {
      await memoryCheckinsStore.createSchedule(
        { question: "Other union", cadence: "daily" },
        {
          unionId: "union-other",
          localId: "local-243",
          createdById: "user-x",
          createdByName: "X",
        },
      );
      await memoryCheckinsStore.createSchedule(
        { question: "Other local", cadence: "daily" },
        {
          unionId: "union-opseu",
          localId: "local-560",
          createdById: "user-y",
          createdByName: "Y",
        },
      );

      authMock.mockResolvedValue(session());
      const res = await listCheckins();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        schedules: Array<{ question: string; unionId: string; localId: string }>;
      };
      expect(body.schedules.every((s) => s.unionId === "union-opseu")).toBe(
        true,
      );
      expect(body.schedules.every((s) => s.localId === "local-243")).toBe(true);
      expect(body.schedules.map((s) => s.question)).not.toContain("Other union");
      expect(body.schedules.map((s) => s.question)).not.toContain("Other local");
    });

    it("forbids a steward from creating a schedule", async () => {
      authMock.mockResolvedValue(
        session({ id: "user-steward-243", roles: ["local_steward"] }),
      );
      const res = await createCheckin(jsonRequest(validCreate));
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Forbidden" });
    });

    it("rejects forged tenant keys and stamps the session union/local/creator", async () => {
      authMock.mockResolvedValue(session());
      const forged = await createCheckin(
        jsonRequest({
          ...validCreate,
          unionId: "union-other",
          localId: "local-evil",
          createdById: "user-attacker",
        }),
      );
      expect(forged.status).toBe(400);

      const created = await createCheckin(jsonRequest(validCreate));
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        schedule: {
          unionId: string;
          localId: string;
          cadence: string;
          createdById: string;
          active: boolean;
        };
      };
      expect(body.schedule.unionId).toBe("union-opseu");
      expect(body.schedule.localId).toBe("local-243");
      expect(body.schedule.createdById).toBe("user-president-243");
      expect(body.schedule.cadence).toBe("daily");
      expect(body.schedule.active).toBe(true);
    });

    it("returns 403 when the checkins module is off for that tenant", async () => {
      const tenant = createOverlayUnion({
        name: "Comms Only Local",
        enabledModules: ["comms", "grievance"],
        localNumber: "888",
      });
      authMock.mockResolvedValue(
        session({
          id: "user-president-888",
          unionId: tenant.union.id,
          localId: tenant.locals![0]!.id,
        }),
      );
      const res = await listCheckins();
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Module not enabled" });
    });
  });

  describe("GET/POST /api/checkins/[id]/answers", () => {
    it("returns 404 for a missing id and for another union, including platform_admin", async () => {
      const foreign = await memoryCheckinsStore.createSchedule(
        { question: "Foreign check-in", cadence: "daily" },
        {
          unionId: "union-other",
          localId: "local-1",
          createdById: "user-other",
          createdByName: "Other",
        },
      );

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      expect(
        (
          await listAnswers(
            new Request("http://localhost/api/checkins/x/answers"),
            params("checkin-missing"),
          )
        ).status,
      ).toBe(404);

      const viewed = await listAnswers(
        new Request("http://localhost/api/checkins/x/answers"),
        params(foreign.id),
      );
      expect(viewed.status).toBe(404);
      expect(await viewed.json()).toEqual({ error: "Not found" });

      const posted = await postAnswer(
        jsonRequest({ body: "Hijack" }),
        params(foreign.id),
      );
      expect(posted.status).toBe(404);
      expect(await memoryCheckinsStore.listAnswers(foreign.id, formatUtcDateKey(new Date()))).toEqual(
        [],
      );
    });

    it("lets a steward answer the current period once, then 409s", async () => {
      authMock.mockResolvedValue(session());
      const created = await createCheckin(jsonRequest(validCreate));
      const schedule = ((await created.json()) as { schedule: { id: string } })
        .schedule;

      authMock.mockResolvedValue(
        session({ id: "user-steward-243", roles: ["local_steward"] }),
      );
      const wrongPeriod = await postAnswer(
        jsonRequest({ body: "Too old", periodKey: "1999-01-01" }),
        params(schedule.id),
      );
      expect(wrongPeriod.status).toBe(400);
      expect(await wrongPeriod.json()).toEqual({
        error: "Answers are only accepted for the current period",
      });

      const first = await postAnswer(
        jsonRequest({ body: "Filed two Step 1s." }),
        params(schedule.id),
      );
      expect(first.status).toBe(201);
      const body = (await first.json()) as {
        answer: {
          authorId: string;
          unionId: string;
          localId: string;
          body: string;
          periodKey: string;
        };
      };
      expect(body.answer.authorId).toBe("user-steward-243");
      expect(body.answer.unionId).toBe("union-opseu");
      expect(body.answer.localId).toBe("local-243");
      expect(body.answer.body).toBe("Filed two Step 1s.");
      expect(body.answer.periodKey).toBe(formatUtcDateKey(new Date()));

      const retry = await postAnswer(
        jsonRequest({ body: "Trying again" }),
        params(schedule.id),
      );
      expect(retry.status).toBe(409);
      expect(await retry.json()).toEqual({
        error: "Already answered this period",
      });
    });

    it("rejects answers on an inactive schedule", async () => {
      authMock.mockResolvedValue(session());
      const created = await createCheckin(jsonRequest(validCreate));
      const schedule = ((await created.json()) as { schedule: { id: string } })
        .schedule;
      const patched = await patchCheckin(
        jsonRequest({ active: false }),
        params(schedule.id),
      );
      expect(patched.status).toBe(200);

      authMock.mockResolvedValue(
        session({ id: "user-steward-243", roles: ["local_steward"] }),
      );
      const res = await postAnswer(
        jsonRequest({ body: "Still working" }),
        params(schedule.id),
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Check-in is inactive" });
    });
  });
});
