import { afterEach, describe, expect, it } from "vitest";
import type { PresidentRoleToolId } from "@/lib/president/module-catalog";
import { migrateLegacyRoleToolsToHubModules } from "@/lib/president/role-tools";
import {
  getEnabledModulesPatch,
  getPresidentRoleToolsPatch,
  resetTenantOverlayForTests,
  setEnabledModulesPatch,
  setPresidentRoleToolsPatch,
} from "@/lib/tenant/overlay";

const UNION = "union-migrate-role-tools";

describe("migrateLegacyRoleToolsToHubModules", () => {
  afterEach(() => {
    resetTenantOverlayForTests();
  });

  it("no-ops when the role-tool patch is empty or missing", () => {
    migrateLegacyRoleToolsToHubModules(UNION);
    expect(getEnabledModulesPatch(UNION)).toBeUndefined();
    expect(getPresidentRoleToolsPatch(UNION)).toBeUndefined();

    setPresidentRoleToolsPatch(UNION, ["meetings"]);
    migrateLegacyRoleToolsToHubModules(UNION);
    expect(getEnabledModulesPatch(UNION)).toBeUndefined();
    expect(getPresidentRoleToolsPatch(UNION)).toEqual(["meetings"]);
  });

  it("promotes legacy expenses/travel role tools into enabledModules and strips them", () => {
    setEnabledModulesPatch(UNION, ["comms", "grievance"]);
    setPresidentRoleToolsPatch(UNION, [
      "meetings",
      "expenses",
      "travel",
    ] as PresidentRoleToolId[]);

    migrateLegacyRoleToolsToHubModules(UNION);

    expect(getEnabledModulesPatch(UNION)?.sort()).toEqual(
      ["comms", "expenses", "grievance", "travel"].sort(),
    );
    expect(getPresidentRoleToolsPatch(UNION)).toEqual(["meetings"]);
  });
});
