import { beforeEach, describe, expect, it } from "vitest";
import { acceptInvite, createInvite, resetInviteStoreForTests } from "@/lib/auth/invites";
import {
  hydrateLocalHall,
  listLocalHallPeople,
} from "@/lib/portal/hall-roster";
import { portalStore } from "@/lib/portal/memory-adapter";
import {
  createOverlayLocal,
  resetTenantOverlayForTests,
} from "@/lib/tenant/overlay";

describe("listLocalHallPeople", () => {
  beforeEach(() => {
    resetInviteStoreForTests();
    resetTenantOverlayForTests();
  });

  it("includes the demo roster for Local 243", async () => {
    const people = await listLocalHallPeople("union-b7p", "local-7");
    expect(people.some((p) => p.userId === "user-president-7")).toBe(true);
    expect(people.some((p) => p.userId === "user-member-7" && !p.admin)).toBe(
      true,
    );
  });

  it("includes accepted invitees for a new local", async () => {
    const local = createOverlayLocal({
      unionId: "union-b7p",
      localNumber: "418",
      subText: "Hall roster",
    });
    const invite = await createInvite({
      email: "member418@example.test",
      name: "Member 418",
      unionId: "union-b7p",
      localId: local.id,
      roles: ["local_member"],
      invitedById: "user-1",
    });
    const result = await acceptInvite(invite.token, "password1");
    expect(result.user?.id).toBeTruthy();
    const people = await listLocalHallPeople("union-b7p", local.id);
    expect(people.some((p) => p.userName === "Member 418")).toBe(true);
  });

  it("joins the visitor and known invitees onto Hall", async () => {
    const local = createOverlayLocal({
      unionId: "union-b7p",
      localNumber: "419",
      subText: "Hydrate",
    });
    const invite = await createInvite({
      email: "steward419@example.test",
      name: "Steward 419",
      unionId: "union-b7p",
      localId: local.id,
      roles: ["local_steward"],
      invitedById: "user-1",
    });
    await acceptInvite(invite.token, "password1");

    const { circle } = await hydrateLocalHall({
      unionId: "union-b7p",
      localId: local.id,
      localNumber: "419",
      currentUser: {
        userId: "user-pres-419",
        userName: "President 419",
        admin: true,
      },
    });

    const forPresident = portalStore.listStation(
      "union-b7p",
      "user-pres-419",
    );
    expect(forPresident.circles.some((c) => c.id === circle.id)).toBe(true);
  });
});
