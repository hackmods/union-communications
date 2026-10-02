import { describe, expect, it } from "vitest";
import {
  isPlatformOperator,
  platformOperatorNavActive,
  PLATFORM_OPERATOR_DASHBOARD_SHORTCUTS,
  PLATFORM_OPERATOR_NAV,
} from "./operator-nav";

describe("platform operator nav", () => {
  it("lists a single chrome link to site admin", () => {
    expect(PLATFORM_OPERATOR_NAV.map((item) => item.href)).toEqual([
      "/app/site-admin",
    ]);
    expect(PLATFORM_OPERATOR_DASHBOARD_SHORTCUTS.map((item) => item.href)).toEqual(
      [
        "/app/invites",
        "/app/onboarding",
        "/app/feedback",
        "/app/audit",
      ],
    );
  });

  it("gates on platform_admin only", () => {
    expect(isPlatformOperator(["platform_admin"])).toBe(true);
    expect(isPlatformOperator(["union_admin"])).toBe(false);
    expect(isPlatformOperator(["local_president"])).toBe(false);
  });

  it("detects active operator routes", () => {
    expect(platformOperatorNavActive("/app/site-admin/host")).toBe(true);
    expect(platformOperatorNavActive("/app/invites")).toBe(true);
    expect(platformOperatorNavActive("/app/feedback")).toBe(true);
    expect(platformOperatorNavActive("/app/grievances")).toBe(false);
  });
});
