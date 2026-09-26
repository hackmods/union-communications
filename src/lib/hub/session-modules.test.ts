import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import {
  getSessionEnabledModules,
  isSessionModuleEnabled,
} from "./session-modules";

vi.mock("@/lib/tenant/loader", () => ({
  getTenantContext: vi.fn((unionId: string) => {
    if (unionId === "u-on") {
      return {
        union: { id: "u-on", enabledModules: ["grievance", "discussions"] },
      };
    }
    return null;
  }),
}));

function sessionFor(unionId?: string): Session {
  return {
    expires: "2099-01-01",
    user: {
      id: "u1",
      email: "a@b.c",
      roles: ["local_president"],
      unionId,
      localId: "l1",
    },
  } as Session;
}

describe("session-modules", () => {
  it("returns empty when union or tenant is missing", () => {
    expect(getSessionEnabledModules(sessionFor())).toEqual([]);
    expect(getSessionEnabledModules(sessionFor("missing"))).toEqual([]);
    expect(isSessionModuleEnabled(sessionFor("missing"), "grievance")).toBe(
      false,
    );
  });

  it("reads enabled modules from tenant context", () => {
    expect(getSessionEnabledModules(sessionFor("u-on"))).toEqual([
      "grievance",
      "discussions",
    ]);
    expect(isSessionModuleEnabled(sessionFor("u-on"), "grievance")).toBe(true);
    expect(isSessionModuleEnabled(sessionFor("u-on"), "bumping")).toBe(false);
  });
});
