import { describe, expect, it } from "vitest";
import {
  canAccessInformalLogModule,
  canConvertInformalLog,
  canCreateInformalLog,
  canDeleteInformalLog,
  canViewInformalLogEntry,
} from "./access";
import type { InformalLogEntry } from "@/types/informal-log";

const entry: InformalLogEntry = {
  id: "log-1",
  unionId: "union-a",
  localId: "local-1",
  topic: "Hours of work",
  channel: "in_person",
  summary: "Spoke with the supervisor before filing.",
  occurredAt: "2026-08-01T12:00:00.000Z",
  loggedById: "steward-1",
  loggedByName: "Alex Steward",
  createdAt: "2026-08-01T12:00:00.000Z",
};

describe("informal log access", () => {
  it("lets stewards and elevated officers into the module, not members", () => {
    expect(canAccessInformalLogModule(["local_steward"])).toBe(true);
    expect(canAccessInformalLogModule(["local_exec"])).toBe(true);
    expect(canAccessInformalLogModule(["local_president"])).toBe(true);
    expect(canCreateInformalLog(["local_steward"])).toBe(true);
    expect(canAccessInformalLogModule(["local_member"])).toBe(false);
    expect(canAccessInformalLogModule([])).toBe(false);
  });

  it("blocks local_exec from converting a log into a grievance", () => {
    expect(canConvertInformalLog(["local_steward"])).toBe(true);
    expect(canConvertInformalLog(["local_president"])).toBe(true);
    expect(canConvertInformalLog(["local_exec"])).toBe(false);
    expect(canConvertInformalLog(["local_steward", "local_exec"])).toBe(false);
    expect(canConvertInformalLog(["local_member"])).toBe(false);
  });

  it("lets the author or an elevated officer delete a log", () => {
    expect(canDeleteInformalLog(entry, "steward-1", ["local_steward"])).toBe(
      true,
    );
    expect(canDeleteInformalLog(entry, "other", ["local_steward"])).toBe(false);
    expect(canDeleteInformalLog(entry, "other", ["local_president"])).toBe(true);
    expect(canDeleteInformalLog(entry, "other", ["local_exec"])).toBe(true);
  });

  it("never allows a cross-union read, even for platform_admin", () => {
    expect(
      canViewInformalLogEntry(entry, "union-b", "local-1", ["platform_admin"]),
    ).toBe(false);
    expect(
      canViewInformalLogEntry(entry, undefined, "local-1", ["local_president"]),
    ).toBe(false);
  });

  it("scopes stewards to their local and lets elevated roles read other locals", () => {
    expect(
      canViewInformalLogEntry(entry, "union-a", "local-1", ["local_steward"]),
    ).toBe(true);
    expect(
      canViewInformalLogEntry(entry, "union-a", "local-2", ["local_steward"]),
    ).toBe(false);
    expect(
      canViewInformalLogEntry(entry, "union-a", "local-2", ["union_admin"]),
    ).toBe(true);
    expect(
      canViewInformalLogEntry(entry, "union-a", "local-1", ["local_member"]),
    ).toBe(false);
  });
});
