import { describe, expect, it } from "vitest";
import {
  canAccessElectionsModule,
  canMutateElections,
  canViewElectionCycle,
} from "./access";
import type { ElectionCycle } from "@/types/elections";

const sample: ElectionCycle = {
  id: "elec-1",
  unionId: "union-a",
  localId: "local-1",
  title: "2026 Executive",
  positions: ["President"],
  status: "open",
  nominations: [],
  tallies: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("elections access", () => {
  it("allows president and elevated admins, denies steward", () => {
    expect(canAccessElectionsModule(["local_president"])).toBe(true);
    expect(canAccessElectionsModule(["platform_admin"])).toBe(true);
    expect(canAccessElectionsModule(["local_steward"])).toBe(false);
    expect(canMutateElections(["local_exec"])).toBe(false);
  });

  it("scopes local presidents to their local", () => {
    expect(
      canViewElectionCycle(sample, "union-a", "local-other", [
        "local_president",
      ]),
    ).toBe(false);
    expect(
      canViewElectionCycle(sample, "union-a", "local-other", ["union_admin"]),
    ).toBe(true);
  });

  it("never allows cross-union reads", () => {
    expect(
      canViewElectionCycle(sample, "union-b", "local-1", ["platform_admin"]),
    ).toBe(false);
  });
});
