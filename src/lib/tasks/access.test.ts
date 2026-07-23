import { describe, expect, it } from "vitest";
import {
  canAccessTasksModule,
  canAssignOthers,
  canCreateTask,
  canDeleteTask,
  canMutateTaskAssignment,
  canViewTask,
  isElevatedTaskRole,
} from "@/lib/tasks/access";
import type { Task } from "@/types/task";
import type { UserRole } from "@/types/tenant";

const sample: Task = {
  id: "t1",
  unionId: "union-a",
  localId: "local-1",
  title: "Do thing",
  assigneeId: "steward-1",
  status: "open",
  createdById: "pres-1",
  createdAt: new Date().toISOString(),
};

describe("tasks access (FEAT-003)", () => {
  it("any hub role can access and create", () => {
    const roles: UserRole[] = [
      "local_steward",
      "local_exec",
      "stability_member",
      "local_president",
    ];
    for (const role of roles) {
      expect(canAccessTasksModule([role])).toBe(true);
      expect(canCreateTask([role])).toBe(true);
    }
  });

  it("only elevated may assign others", () => {
    expect(canAssignOthers(["local_steward"])).toBe(false);
    expect(canAssignOthers(["local_exec"])).toBe(false);
    expect(canAssignOthers(["local_president"])).toBe(true);
    expect(isElevatedTaskRole(["local_exec"])).toBe(false);
  });

  it("assignee or elevated may mark done / reassign", () => {
    expect(
      canMutateTaskAssignment(sample, "steward-1", "union-a", "local-1", [
        "local_steward",
      ]),
    ).toBe(true);
    expect(
      canMutateTaskAssignment(sample, "other", "union-a", "local-1", [
        "local_steward",
      ]),
    ).toBe(false);
    expect(
      canMutateTaskAssignment(sample, "other", "union-a", "local-1", [
        "local_president",
      ]),
    ).toBe(true);
    expect(
      canMutateTaskAssignment(sample, "exec-1", "union-a", "local-1", [
        "local_exec",
      ]),
    ).toBe(false);
  });

  it("creator may delete; steward non-owner may not", () => {
    expect(
      canDeleteTask(sample, "pres-1", "union-a", "local-1", ["local_president"]),
    ).toBe(true);
    expect(
      canDeleteTask(sample, "steward-1", "union-a", "local-1", [
        "local_steward",
      ]),
    ).toBe(false);
  });

  it("never allows cross-union views", () => {
    expect(
      canViewTask(sample, "steward-1", "other-union", "local-1", [
        "platform_admin",
      ]),
    ).toBe(false);
  });
});
