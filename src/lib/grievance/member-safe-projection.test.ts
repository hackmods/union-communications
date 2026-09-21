import { describe, expect, it } from "vitest";
import { projectMemberSafeGrievance } from "@/lib/grievance/member-safe-projection";

describe("member-safe grievance projection", () => {
  it("returns only the explicit allowlist of member-facing fields", () => {
    const result = projectMemberSafeGrievance({
      grievance: {
        id: "case-1",
        unionId: "union-1",
        localId: "local-1",
        memberUserId: "member-1",
        memberPseudonym: "Member A",
        privacyMode: "restricted",
        category: "Hours of work",
        status: "in_progress",
        currentStep: 2,
        filedAt: "2026-09-01T00:00:00.000Z",
        assignedStewardId: "worker-1",
        createdById: "president-1",
        updatedAt: "2026-09-02T00:00:00.000Z",
      },
      dueAt: "2026-09-30T00:00:00.000Z",
      updates: [{ id: "update-1", body: "A member-safe update", publishedAt: "2026-09-03T00:00:00.000Z" }],
      attachments: [{ id: "attachment-1" }],
    });

    expect(Object.keys(result).sort()).toEqual([
      "attachments", "category", "currentStep", "dueAt", "filedAt", "id", "status", "updates",
    ]);
    expect(result).toEqual({
      id: "case-1",
      category: "Hours of work",
      filedAt: "2026-09-01T00:00:00.000Z",
      status: "in_progress",
      currentStep: 2,
      dueAt: "2026-09-30T00:00:00.000Z",
      updates: [{ id: "update-1", body: "A member-safe update", publishedAt: "2026-09-03T00:00:00.000Z" }],
      attachments: [{ id: "attachment-1" }],
    });
  });
});
