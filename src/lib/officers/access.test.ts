import { describe, expect, it } from "vitest";
import {
  canAccessOfficerRoster,
  canManageOfficerRoster,
  canViewOfficerRosterEntry,
} from "./access";
import type { OfficerRosterEntry } from "@/types/officer-roster";

const entry: OfficerRosterEntry = {
  id: "o1",
  unionId: "u1",
  localId: "l1",
  name: "Alex",
  role: "President",
  termStart: "2026-01-01",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("officers access", () => {
  it("gates manage to president/admin handoff tier", () => {
    expect(canManageOfficerRoster(["local_president"])).toBe(true);
    expect(canManageOfficerRoster(["local_steward"])).toBe(false);
    expect(canAccessOfficerRoster(["union_admin"])).toBe(true);
  });

  it("scopes view by union and local", () => {
    expect(
      canViewOfficerRosterEntry(entry, "u1", "l1", ["local_president"]),
    ).toBe(true);
    expect(
      canViewOfficerRosterEntry(entry, "u2", "l1", ["local_president"]),
    ).toBe(false);
    expect(
      canViewOfficerRosterEntry(entry, "u1", "l2", ["local_president"]),
    ).toBe(false);
    expect(
      canViewOfficerRosterEntry(entry, "u1", "l2", ["union_admin"]),
    ).toBe(true);
  });
});
