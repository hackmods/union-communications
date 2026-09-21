import { afterEach, describe, expect, it } from "vitest";
import { memoryGrievanceStore, resetGrievanceMemoryForTests } from "@/lib/grievance/memory-adapter";

describe("hybrid grievance imports", () => {
  afterEach(() => resetGrievanceMemoryForTests());

  it("preserves server-managed member, privacy, and assignment fields in replace mode", async () => {
    const created = await memoryGrievanceStore.create({
      category: "Discipline",
      filedAt: "2026-09-01T00:00:00.000Z",
      memberUserId: "member-1",
      privacyMode: "restricted",
      assignedStewardId: "case-worker-1",
    }, {
      unionId: "union-b7p",
      localId: "local-7",
      createdById: "president-1",
      assignedStewardId: "case-worker-1",
    });

    const imported = {
      ...created,
      grievance: {
        ...created.grievance,
        category: "Imported category",
        memberUserId: "attacker-member",
        privacyMode: "standard" as const,
        assignedStewardId: "attacker-worker",
        createdById: "attacker",
      },
      events: [],
      notes: [],
    };
    const result = await memoryGrievanceStore.importLocalSlice("union-b7p", "local-7", [imported], "replace");
    const saved = await memoryGrievanceStore.getById(created.grievance.id);

    expect(result).toEqual({ imported: 1, removed: 0 });
    expect(saved?.grievance).toMatchObject({
      category: "Imported category",
      memberUserId: "member-1",
      privacyMode: "restricted",
      assignedStewardId: "case-worker-1",
    });
    expect(saved?.grievance.createdById).toBe("president-1");
    expect(await memoryGrievanceStore.getById("grev-002")).not.toBeNull();
  });
});
