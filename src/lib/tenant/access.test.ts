import { describe, expect, it } from "vitest";
import {
  canInvitePresidents,
  canInviteRoles,
  inviteRolesForActor,
} from "@/lib/tenant/access";

describe("invite role ladder", () => {
  it("lets platform admin invite union admin and presidents", () => {
    const roles = inviteRolesForActor(["platform_admin"]);
    expect(roles).toEqual(
      expect.arrayContaining([
        "union_admin",
        "division_admin",
        "local_president",
        "local_member",
      ]),
    );
    expect(canInvitePresidents(["platform_admin"])).toBe(true);
    expect(canInviteRoles(["platform_admin"], ["union_admin"])).toBe(true);
  });

  it("lets union admin invite presidents and members, not union admin", () => {
    expect(canInvitePresidents(["union_admin"])).toBe(true);
    expect(
      canInviteRoles(["union_admin"], ["local_president", "local_member"]),
    ).toBe(true);
    expect(canInviteRoles(["union_admin"], ["union_admin"])).toBe(false);
  });

  it("rejects a local president inviting union admin", () => {
    expect(canInvitePresidents(["local_president"])).toBe(false);
    expect(canInviteRoles(["local_president"], ["union_admin"])).toBe(false);
    expect(canInviteRoles(["local_president"], ["division_admin"])).toBe(false);
    expect(
      canInviteRoles(["local_president"], ["local_steward", "local_member"]),
    ).toBe(true);
    expect(inviteRolesForActor(["local_president"])).not.toContain(
      "local_president",
    );
  });

  it("rejects empty requested roles", () => {
    expect(canInviteRoles(["local_president"], [])).toBe(false);
  });
});
