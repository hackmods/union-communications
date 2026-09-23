import { beforeEach, describe, expect, it } from "vitest";
import { memoryTimeStore } from "@/lib/time/memory-adapter";
import { resetTimeStore } from "@/lib/time/store";
import {
  canApprovePtoRequest,
  canCancelPtoRequest,
  canViewPtoRequest,
} from "@/lib/time/access";
import type { PtoRequest } from "@/types/time";

describe("PTO 8c.1 memory adapter", () => {
  beforeEach(() => {
    resetTimeStore();
  });

  it("creates, lists, and approves a leave request", async () => {
    const created = await memoryTimeStore.createPtoRequest(
      {
        workerId: "user-steward-7",
        workerName: "Local 777 Steward",
        ptoType: "vacation",
        startsAt: "2030-08-01T09:00:00.000Z",
        endsAt: "2030-08-05T17:00:00.000Z",
        hoursRequested: 32,
        status: "submitted",
      },
      {
        unionId: "union-b7p",
        localId: "local-7",
        requestedById: "user-steward-7",
      },
    );
    expect(created.status).toBe("submitted");

    const listed = await memoryTimeStore.listPtoRequests({
      unionId: "union-b7p",
      localId: "local-7",
      workerId: "user-steward-7",
    });
    expect(listed.some((r) => r.id === created.id)).toBe(true);

    const approved = await memoryTimeStore.updatePtoRequestStatus(
      created.id,
      "approved",
      { approvedById: "user-president-7" },
    );
    expect(approved?.status).toBe("approved");
    expect(approved?.approvedById).toBe("user-president-7");
  });

  it("rejects invalid ranges", async () => {
    await expect(
      memoryTimeStore.createPtoRequest(
        {
          workerId: "user-steward-7",
          workerName: "Steward",
          ptoType: "sick",
          startsAt: "2030-08-05T09:00:00.000Z",
          endsAt: "2030-08-01T09:00:00.000Z",
        },
        {
          unionId: "union-b7p",
          localId: "local-7",
          requestedById: "user-steward-7",
        },
      ),
    ).rejects.toThrow(/after/i);
  });

  it("decrements accrual balance on approve when hoursRequested set", async () => {
    await memoryTimeStore.upsertPtoBalance(
      {
        workerId: "user-steward-7",
        ptoType: "vacation",
        hours: 40,
        mode: "set",
      },
      {
        unionId: "union-b7p",
        localId: "local-7",
        updatedById: "user-president-7",
      },
    );
    const created = await memoryTimeStore.createPtoRequest(
      {
        workerId: "user-steward-7",
        workerName: "Steward",
        ptoType: "vacation",
        startsAt: "2030-08-10T09:00:00.000Z",
        endsAt: "2030-08-11T17:00:00.000Z",
        hoursRequested: 8,
        status: "submitted",
      },
      {
        unionId: "union-b7p",
        localId: "local-7",
        requestedById: "user-steward-7",
      },
    );
    await memoryTimeStore.updatePtoRequestStatus(created.id, "approved", {
      approvedById: "user-president-7",
    });
    const balances = await memoryTimeStore.listPtoBalances({
      unionId: "union-b7p",
      localId: "local-7",
      workerId: "user-steward-7",
      ptoType: "vacation",
    });
    expect(balances[0]?.hoursBalance).toBe(32);
  });
});

describe("PTO access", () => {
  const sample: PtoRequest = {
    id: "pto-1",
    unionId: "union-b7p",
    localId: "local-7",
    workerId: "user-steward-7",
    workerName: "Steward",
    ptoType: "personal",
    status: "submitted",
    startsAt: "2030-01-01T00:00:00.000Z",
    endsAt: "2030-01-02T00:00:00.000Z",
    requestedById: "user-steward-7",
    createdAt: "2030-01-01T00:00:00.000Z",
    updatedAt: "2030-01-01T00:00:00.000Z",
  };

  it("lets stewards view/cancel own submitted requests", () => {
    expect(
      canViewPtoRequest(
        sample,
        "user-steward-7",
        "union-b7p",
        "local-7",
        ["local_steward"],
      ),
    ).toBe(true);
    expect(
      canCancelPtoRequest(
        sample,
        "user-steward-7",
        "union-b7p",
        "local-7",
        ["local_steward"],
      ),
    ).toBe(true);
    expect(
      canApprovePtoRequest(
        sample,
        "user-steward-7",
        "union-b7p",
        "local-7",
        ["local_steward"],
      ),
    ).toBe(false);
  });

  it("lets presidents approve submitted requests", () => {
    expect(
      canApprovePtoRequest(
        sample,
        "user-president-7",
        "union-b7p",
        "local-7",
        ["local_president"],
      ),
    ).toBe(true);
  });
});
