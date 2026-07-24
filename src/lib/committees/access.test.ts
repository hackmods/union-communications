import { describe, expect, it } from "vitest";
import {
  canAccessCommitteesModule,
  canMutateCommittees,
  canViewCommittee,
} from "./access";
import type { Committee } from "@/types/committees";

const sample: Committee = {
  id: "com-1",
  unionId: "union-a",
  localId: "local-1",
  name: "Health & Safety",
  memberOfficerIds: ["off-1"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("committees access", () => {
  it("allows president and elevated admins, denies steward and local_exec", () => {
    expect(canAccessCommitteesModule(["local_president"])).toBe(true);
    expect(canAccessCommitteesModule(["union_admin"])).toBe(true);
    expect(canAccessCommitteesModule(["local_steward"])).toBe(false);
    expect(canAccessCommitteesModule(["local_exec"])).toBe(false);
    expect(canMutateCommittees(["local_steward"])).toBe(false);
  });

  it("scopes local presidents to their local; elevated may cross-local", () => {
    expect(
      canViewCommittee(sample, "union-a", "local-other", ["local_president"]),
    ).toBe(false);
    expect(
      canViewCommittee(sample, "union-a", "local-other", ["union_admin"]),
    ).toBe(true);
  });

  it("never allows cross-union reads", () => {
    expect(
      canViewCommittee(sample, "union-b", "local-1", ["platform_admin"]),
    ).toBe(false);
  });
});
