import { beforeEach, describe, expect, it } from "vitest";
import {
  canMutateTimeShift,
  canViewTimeShift,
} from "@/lib/time/access";
import { memoryTimeStore } from "@/lib/time/memory-adapter";
import { resetTimeStore } from "@/lib/time/store";
import type { TimeShift } from "@/types/time";

describe("Time 8c.2 shifts memory adapter", () => {
  beforeEach(() => {
    resetTimeStore();
  });

  it("creates, lists, publishes, and cancels a shift", async () => {
    const created = await memoryTimeStore.createShift(
      {
        label: "Picket morning",
        startsAt: "2030-09-01T09:00:00.000Z",
        endsAt: "2030-09-01T13:00:00.000Z",
        category: "action",
        assignedWorkerIds: ["user-steward-243"],
        status: "draft",
      },
      {
        unionId: "union-opseu",
        localId: "local-243",
        createdById: "user-president-243",
      },
    );
    expect(created.status).toBe("draft");

    const listed = await memoryTimeStore.listShifts({
      unionId: "union-opseu",
      localId: "local-243",
      workerId: "user-steward-243",
    });
    expect(listed.some((s) => s.id === created.id)).toBe(true);

    const published = await memoryTimeStore.updateShift(created.id, {
      status: "published",
    });
    expect(published?.status).toBe("published");

    const cancelled = await memoryTimeStore.updateShift(created.id, {
      status: "cancelled",
    });
    expect(cancelled?.status).toBe("cancelled");
  });

  it("stores shiftId on clock-in", async () => {
    const shift = await memoryTimeStore.createShift(
      {
        label: "Office desk",
        startsAt: "2030-09-02T09:00:00.000Z",
        endsAt: "2030-09-02T17:00:00.000Z",
        category: "staff",
        assignedWorkerIds: ["user-steward-243"],
        status: "published",
      },
      {
        unionId: "union-opseu",
        localId: "local-243",
        createdById: "user-president-243",
      },
    );

    const entry = await memoryTimeStore.clockIn(
      {
        category: "staff",
        jobCodeId: "code-staff-office",
        shiftId: shift.id,
      },
      {
        unionId: "union-opseu",
        localId: "local-243",
        workerId: "user-steward-243",
        workerName: "Steward",
        jobCodeLabel: "Office / admin",
      },
    );
    expect(entry.shiftId).toBe(shift.id);
  });
});

describe("Shift access", () => {
  const sample: TimeShift = {
    id: "shift-1",
    unionId: "union-opseu",
    localId: "local-243",
    label: "Desk",
    startsAt: "2030-01-01T09:00:00.000Z",
    endsAt: "2030-01-01T17:00:00.000Z",
    category: "staff",
    assignedWorkerIds: ["user-steward-243"],
    status: "published",
    createdById: "user-president-243",
    createdAt: "2030-01-01T00:00:00.000Z",
    updatedAt: "2030-01-01T00:00:00.000Z",
  };

  it("lets assigned workers view published shifts only", () => {
    expect(
      canViewTimeShift(
        sample,
        "user-steward-243",
        "union-opseu",
        "local-243",
        ["local_steward"],
      ),
    ).toBe(true);
    expect(
      canViewTimeShift(
        { ...sample, status: "draft" },
        "user-steward-243",
        "union-opseu",
        "local-243",
        ["local_steward"],
      ),
    ).toBe(false);
    expect(
      canMutateTimeShift(
        sample,
        "user-steward-243",
        "union-opseu",
        "local-243",
        ["local_steward"],
      ),
    ).toBe(false);
    expect(
      canMutateTimeShift(
        sample,
        "user-president-243",
        "union-opseu",
        "local-243",
        ["local_president"],
      ),
    ).toBe(true);
  });
});
