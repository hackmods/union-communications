import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import type { UserRole } from "@/types/tenant";
import {
  USER_ROLES,
  formatRoleLabel,
  formatRoleList,
  humanizeRoleId,
  isUserRole,
} from "./role-labels";

describe("role-labels", () => {
  it("lists every UserRole exactly once", () => {
    const expected: UserRole[] = [
      "platform_admin",
      "union_admin",
      "division_admin",
      "local_president",
      "local_steward",
      "local_exec",
      "stability_member",
      "local_member",
      "solo_account",
    ];
    expect([...USER_ROLES]).toEqual(expected);
    expect(new Set(USER_ROLES).size).toBe(USER_ROLES.length);
  });

  it("keeps EN/FR hub.roleLabels in parity with USER_ROLES", () => {
    const enLabels = en.hub.roleLabels as Record<string, string>;
    const frLabels = fr.hub.roleLabels as Record<string, string>;
    expect(Object.keys(enLabels).sort()).toEqual([...USER_ROLES].sort());
    expect(Object.keys(frLabels).sort()).toEqual([...USER_ROLES].sort());
    for (const role of USER_ROLES) {
      expect(enLabels[role].length).toBeGreaterThan(0);
      expect(frLabels[role].length).toBeGreaterThan(0);
      expect(enLabels[role]).not.toBe(role);
      expect(frLabels[role]).not.toBe(role);
    }
  });

  it("formats known roles via the translator", () => {
    const labels = en.hub.roleLabels as Record<string, string>;
    const t = Object.assign((key: string) => labels[key]!, {
      has: (key: string) => key in labels,
    });
    expect(formatRoleLabel("platform_admin", t)).toBe("Platform admin");
    expect(formatRoleLabel("local_steward", t)).toBe("Local steward");
    expect(
      formatRoleList(["union_admin", "local_president"], t),
    ).toBe("Union admin, Local president");
  });

  it("humanizes unknown role ids instead of crashing", () => {
    expect(humanizeRoleId("custom_officer")).toBe("Custom Officer");
    expect(isUserRole("custom_officer")).toBe(false);
    const t = Object.assign((key: string) => {
      throw new Error(`missing ${key}`);
    }, { has: () => false });
    expect(formatRoleLabel("custom_officer", t)).toBe("Custom Officer");
  });
});
