import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";
import type { ReportsSummary } from "@/lib/reports/aggregate";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as getSummary } from "@/app/api/reports/summary/route";
import { memoryBumpingStore } from "@/lib/bumping/memory-adapter";
import { resetBumpingStore } from "@/lib/bumping/store";
import {
  memoryGrievanceStore,
  resetGrievanceMemoryForTests,
} from "@/lib/grievance/memory-adapter";
import { resetGrievanceStore } from "@/lib/grievance/store";
import { memoryTimeStore } from "@/lib/time/memory-adapter";
import { resetTimeStore } from "@/lib/time/store";

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

const RANGE =
  "http://localhost/api/reports/summary?from=2020-01-01T00:00:00.000Z&to=2035-12-31T23:59:59.000Z";

const position = {
  title: "Desk",
  duties: "Support",
  qualifications: "Diploma",
  seniorityNotes: "n/a",
};

async function seedGrievance(input: {
  unionId?: string;
  localId?: string;
  category: string;
}) {
  return memoryGrievanceStore.create(
    {
      category: input.category,
      filedAt: "2026-02-01T12:00:00.000Z",
    },
    {
      unionId: input.unionId ?? "union-opseu",
      localId: input.localId ?? "local-243",
      createdById: "user-president-243",
      assignedStewardId: "user-steward-243",
    },
  );
}

describe("GET /api/reports/summary", () => {
  beforeEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
    resetBumpingStore();
    resetTimeStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
    resetBumpingStore();
    resetTimeStore();
  });

  it("returns 401 without a session and 403 for members and stewards", async () => {
    authMock.mockResolvedValue(null);
    expect((await getSummary(new Request(RANGE))).status).toBe(401);

    authMock.mockResolvedValue(session({ roles: ["local_member"] }));
    expect((await getSummary(new Request(RANGE))).status).toBe(403);

    authMock.mockResolvedValue(
      session({ id: "user-steward-243", roles: ["local_steward"] }),
    );
    const forbidden = await getSummary(new Request(RANGE));
    expect(forbidden.status).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "Forbidden" });
  });

  it("rolls up only the president's union and local", async () => {
    authMock.mockResolvedValue(session());
    const beforeRes = await getSummary(new Request(RANGE));
    expect(beforeRes.status).toBe(200);
    const before = (await beforeRes.json()) as ReportsSummary;
    const grievanceTotal = before.grievances.total;
    const bumpingTotal = before.bumping.total;
    const timeCount = before.time.entryCount;

    await seedGrievance({
      unionId: "union-other",
      localId: "local-1",
      category: "Foreign discipline",
    });
    await seedGrievance({
      localId: "local-560",
      category: "Sister scheduling",
    });
    await memoryBumpingStore.create(
      {
        memberRef: "Foreign bump",
        seniorityDate: "2010-01-01",
        currentPosition: "A",
        targetPosition: "B",
        scenario: "other union",
        incumbentPosition: position,
        bumpingPosition: position,
      },
      {
        unionId: "union-other",
        localId: "local-1",
        createdById: "user-other",
      },
    );
    await memoryBumpingStore.create(
      {
        memberRef: "Sister bump",
        seniorityDate: "2011-01-01",
        currentPosition: "A",
        targetPosition: "B",
        scenario: "sister local",
        incumbentPosition: position,
        bumpingPosition: position,
      },
      {
        unionId: "union-opseu",
        localId: "local-560",
        createdById: "user-560",
      },
    );
    await memoryTimeStore.createManualEntry(
      {
        category: "release",
        jobCodeId: "code-release-grievance",
        clockInAt: "2026-02-10T09:00:00.000Z",
        clockOutAt: "2026-02-10T17:00:00.000Z",
        workerId: "user-other-union",
        workerName: "Other union",
        status: "submitted",
        entrySource: "manual_range",
      },
      {
        unionId: "union-other",
        localId: "local-1",
        jobCodeLabel: "Grievance handling",
      },
    );
    await memoryTimeStore.createManualEntry(
      {
        category: "release",
        jobCodeId: "code-release-grievance",
        clockInAt: "2026-02-11T09:00:00.000Z",
        clockOutAt: "2026-02-11T17:00:00.000Z",
        workerId: "user-560",
        workerName: "Sister",
        status: "submitted",
        entrySource: "manual_range",
      },
      {
        unionId: "union-opseu",
        localId: "local-560",
        jobCodeLabel: "Grievance handling",
      },
    );

    const afterLeak = (await (
      await getSummary(new Request(RANGE))
    ).json()) as ReportsSummary;
    expect(afterLeak.grievances.total).toBe(grievanceTotal);
    expect(afterLeak.bumping.total).toBe(bumpingTotal);
    expect(afterLeak.time.entryCount).toBe(timeCount);

    await seedGrievance({ category: "Home overtime" });
    const homeTime = await memoryTimeStore.createManualEntry(
      {
        category: "release",
        jobCodeId: "code-release-grievance",
        clockInAt: "2026-02-12T09:00:00.000Z",
        clockOutAt: "2026-02-12T17:00:00.000Z",
        workerId: "user-steward-243",
        workerName: "Local 243 Steward",
        status: "submitted",
        entrySource: "manual_range",
      },
      {
        unionId: "union-opseu",
        localId: "local-243",
        jobCodeLabel: "Grievance handling",
      },
    );
    expect(homeTime.unionId).toBe("union-opseu");

    const afterHome = (await (
      await getSummary(new Request(RANGE))
    ).json()) as ReportsSummary;
    expect(afterHome.grievances.total).toBe(grievanceTotal + 1);
    expect(afterHome.time.entryCount).toBe(timeCount + 1);
    expect(afterHome.grievances.byCategory.some((row) => row.key === "Home overtime")).toBe(
      true,
    );
    expect(
      afterHome.grievances.byCategory.some((row) => row.key === "Foreign discipline"),
    ).toBe(false);
    expect(
      afterHome.grievances.byCategory.some((row) => row.key === "Sister scheduling"),
    ).toBe(false);
  });
});
