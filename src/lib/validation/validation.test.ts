import { describe, expect, it } from "vitest";
import { updateGrievanceSchema } from "@/lib/validation/grievance";
import { updateBumpingCaseSchema } from "@/lib/validation/bumping";
import { grievanceStore } from "@/lib/grievance/memory-adapter";
import { bumpingStore } from "@/lib/bumping/memory-adapter";

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
