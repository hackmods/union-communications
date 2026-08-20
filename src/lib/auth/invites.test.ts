import { describe, expect, it, beforeEach } from "vitest";
import {
  acceptInvite,
  createInvite,
  listInvitesForUnion,
  resetInviteStoreForTests,
} from "@/lib/auth/invites";
import { createOverlayLocal, resetTenantOverlayForTests } from "@/lib/tenant/overlay";
import { portalStore } from "@/lib/portal/memory-adapter";

describe("listInvitesForUnion (memory)", () => {
  beforeEach(() => {
    resetInviteStoreForTests();
  });

  it("lists pending invites for a union and can filter by local", async () => {
    await createInvite({
      email: "a@example.test",
      name: "A",
      unionId: "union-opseu",
      localId: "local-243",
      roles: ["local_steward"],
      invitedById: "user-1",
    });
    await createInvite({
      email: "b@example.test",
      name: "B",
      unionId: "union-opseu",
      localId: "local-415",
      roles: ["local_member"],
      invitedById: "user-1",
    });
    const all = await listInvitesForUnion({ unionId: "union-opseu" });
    expect(all).toHaveLength(2);
    const scoped = await listInvitesForUnion({
      unionId: "union-opseu",
      localId: "local-415",
    });
    expect(scoped).toHaveLength(1);
    expect(scoped[0]?.email).toBe("b@example.test");
  });

  it("joins Hall when a member accepts an invite for a new local", async () => {
    resetTenantOverlayForTests();
    const local = createOverlayLocal({
      unionId: "union-opseu",
      localNumber: "415",
      subText: "Pilot",
    });
    const invite = await createInvite({
      email: "member@example.test",
      name: "Member 415",
      unionId: "union-opseu",
      localId: local.id,
      roles: ["local_member"],
      invitedById: "user-1",
    });
    const result = await acceptInvite(invite.token, "password1");
    expect(result.user?.id).toBeTruthy();
    const station = portalStore.listStation("union-opseu", result.user!.id);
    expect(
      station.circles.some(
        (c) => c.kind === "local_hall" && c.localId === local.id,
      ),
    ).toBe(true);
  });
});
