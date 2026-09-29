import { describe, expect, it } from "vitest";
import { isLocalEmpty } from "@/lib/site-admin/local-lifecycle";

describe("isLocalEmpty", () => {
  it("is empty only when every attachment count is zero", () => {
    expect(
      isLocalEmpty({
        users: 0,
        memberships: 0,
        invites: 0,
        bargainingUnits: 0,
        casework: 0,
      }),
    ).toBe(true);
    expect(
      isLocalEmpty({
        users: 1,
        memberships: 0,
        invites: 0,
        bargainingUnits: 0,
        casework: 0,
      }),
    ).toBe(false);
    expect(
      isLocalEmpty({
        users: 0,
        memberships: 0,
        invites: 0,
        bargainingUnits: 0,
        casework: 2,
      }),
    ).toBe(false);
  });
});
