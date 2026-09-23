import { describe, expect, it } from "vitest";
import {
  canAssignLocalNumber,
  canElevateLocalNumber,
} from "./local-number-access";

describe("local-number-access", () => {
  it("lets platform and union admins elevate Local Number", () => {
    expect(canElevateLocalNumber(["platform_admin"])).toBe(true);
    expect(canElevateLocalNumber(["union_admin"])).toBe(true);
    expect(canElevateLocalNumber(["division_admin"])).toBe(false);
    expect(canElevateLocalNumber(["local_president"])).toBe(false);
  });

  it("lets presidents assign within their own local (caller scopes)", () => {
    expect(canAssignLocalNumber(["local_president"])).toBe(true);
    expect(canAssignLocalNumber(["platform_admin"])).toBe(true);
    expect(canAssignLocalNumber(["union_admin"])).toBe(true);
    expect(canAssignLocalNumber(["local_steward"])).toBe(false);
  });
});
