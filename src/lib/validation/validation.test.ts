import { describe, expect, it } from "vitest";
import {
  createGrievanceOutcomeSchema,
  updateGrievanceSchema,
} from "@/lib/validation/grievance";
import { updateBumpingCaseSchema } from "@/lib/validation/bumping";
import { grievanceStore } from "@/lib/grievance/memory-adapter";
import { bumpingStore } from "@/lib/bumping/store";

describe("SEC-006 mass-assignment guards", () => {
  it("rejects unknown keys on updateGrievanceSchema (including unionId)", () => {
    const parsed = updateGrievanceSchema.safeParse({
      status: "open",
      unionId: "other-union",
      id: "forged",
    });
    expect(parsed.success).toBe(false);
  });

  it("does not change stored unionId when adapter update is called with forged fields", async () => {
    const before = await grievanceStore.getById("grev-001");
    expect(before).not.toBeNull();
    const forged = {
      status: "in_progress" as const,
      unionId: "other-union",
      id: "hijacked",
      localId: "local-evil",
    };
    // Adapter only accepts UpdateGrievanceInput; cast simulates a buggy caller.
    const updated = await grievanceStore.update(
      "grev-001",
      forged as Parameters<typeof grievanceStore.update>[1],
    );
    expect(updated?.unionId).toBe(before!.grievance.unionId);
    expect(updated?.id).toBe("grev-001");
    expect(updated?.localId).toBe(before!.grievance.localId);
    expect(updated?.status).toBe("in_progress");
  });

  it("rejects unknown keys on updateBumpingCaseSchema", () => {
    const parsed = updateBumpingCaseSchema.safeParse({
      status: "open",
      unionId: "other-union",
    });
    expect(parsed.success).toBe(false);
  });

  it("does not change stored unionId on bumping adapter update with forged fields", async () => {
    const before = await bumpingStore.getById("bump-001");
    expect(before).not.toBeNull();
    const forged = {
      status: "open" as const,
      unionId: "other-union",
      id: "hijacked",
    };
    const updated = await bumpingStore.update(
      "bump-001",
      forged as Parameters<typeof bumpingStore.update>[1],
    );
    expect(updated?.unionId).toBe(before!.bumpingCase.unionId);
    expect(updated?.id).toBe("bump-001");
    expect(updated?.status).toBe("open");
  });
});

describe("FEAT-004 grievance outcome", () => {
  it("rejects tenant identity keys on createGrievanceOutcomeSchema", () => {
    const parsed = createGrievanceOutcomeSchema.safeParse({
      outcomeType: "settled",
      decidedAt: "2026-07-01T12:00:00.000Z",
      unionId: "other-union",
      grievanceId: "forged",
      recordedById: "attacker",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a valid outcome payload", () => {
    const parsed = createGrievanceOutcomeSchema.safeParse({
      outcomeType: "upheld",
      remedy: "Reinstatement with back pay",
      arbitratorName: "A. Neutral",
      hearingDate: "2026-06-15T09:00:00.000Z",
      decidedAt: "2026-07-01T12:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });

  it("records and retrieves an outcome via the memory adapter", async () => {
    const decidedAt = "2026-07-01T12:00:00.000Z";
    const recorded = await grievanceStore.recordOutcome(
      "grev-001",
      {
        outcomeType: "settled",
        settlementTerms: "Without prejudice resolution",
        decidedAt,
      },
      { recordedById: "user-president-243" },
    );
    expect(recorded).not.toBeNull();
    expect(recorded?.grievanceId).toBe("grev-001");
    expect(recorded?.outcomeType).toBe("settled");
    expect(recorded?.recordedById).toBe("user-president-243");
    expect(recorded?.decidedAt).toBe(decidedAt);

    const fetched = await grievanceStore.getOutcome("grev-001");
    expect(fetched?.id).toBe(recorded!.id);
    expect(fetched?.settlementTerms).toBe("Without prejudice resolution");
  });

  it("upserts outcome on re-record for the same grievance", async () => {
    const first = await grievanceStore.recordOutcome(
      "grev-002",
      {
        outcomeType: "denied",
        decidedAt: "2026-05-01T00:00:00.000Z",
      },
      { recordedById: "user-president-243" },
    );
    const second = await grievanceStore.recordOutcome(
      "grev-002",
      {
        outcomeType: "withdrawn",
        decidedAt: "2026-06-01T00:00:00.000Z",
      },
      { recordedById: "user-steward-243" },
    );
    expect(second?.id).toBe(first?.id);
    expect(second?.outcomeType).toBe("withdrawn");
    expect(second?.recordedById).toBe("user-steward-243");
  });

  it("returns null when recording outcome for unknown grievance", async () => {
    const result = await grievanceStore.recordOutcome(
      "grev-missing",
      {
        outcomeType: "upheld",
        decidedAt: "2026-07-01T00:00:00.000Z",
      },
      { recordedById: "user-president-243" },
    );
    expect(result).toBeNull();
  });
});
