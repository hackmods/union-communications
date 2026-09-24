import { describe, expect, it } from "vitest";
import {
  actorFromSession,
  decideCapability,
  mergeRoleClaimBridge,
  relationshipsFromRoleClaims,
  type AuthorizationActor,
} from "@/lib/authorization/model";
import type { Session } from "next-auth";

const base: AuthorizationActor = {
  userId: "member-1",
  unionId: "union-1",
  activeLocalId: "local-1",
  roles: [],
  memberships: [{ unionId: "union-1", localId: "local-1", isPrimary: true }],
  assignments: [],
  delegations: [],
  circleMemberships: [],
  mfaVerified: false,
  accountActive: true,
  source: "session",
};

describe("shared authorization decisions", () => {
  it("does not turn context-switch IDs into local membership grants", () => {
    const session = {
      user: { id: "member-1", unionId: "union-1", localId: "local-1", accessibleLocalIds: ["local-2"], roles: [] },
      expires: "2099-01-01",
    } as unknown as Session;
    const actor = actorFromSession(session);
    expect(actor.memberships.map((membership) => membership.localId)).toEqual(["local-1"]);
    expect(decideCapability(actor, "grievances.case.read", { unionId: "union-1", localId: "local-2" })).toMatchObject({
      allowed: false,
      reason: "active_local_membership_required",
    });
  });

  it("does not expand a local office or delegation into union-wide authority", () => {
    const actor: AuthorizationActor = {
      ...base,
      assignments: [{ unionId: "union-1", localId: "local-1", position: "president" }],
      delegations: [{ unionId: "union-1", localId: "local-1", capability: "circles.create", grantorUserId: "other", endsAt: new Date(Date.now() + 60_000).toISOString() }],
    };
    expect(decideCapability(actor, "circles.create", { unionId: "union-1" }).allowed).toBe(false);
  });

  it("grants a platform administrator management capability without granting case content", () => {
    const actor = { ...base, memberships: [], roles: ["platform_admin"] as AuthorizationActor["roles"] };
    expect(decideCapability(actor, "memberships.manage", { unionId: "union-1", localId: "local-9" }).allowed).toBe(true);
    expect(decideCapability(actor, "grievances.case.read", { unionId: "union-1", localId: "local-9" }).allowed).toBe(false);
  });

  it("lets platform_admin manage without a home union", () => {
    const actor: AuthorizationActor = {
      ...base,
      unionId: undefined,
      memberships: [],
      roles: ["platform_admin"],
    };
    expect(
      decideCapability(actor, "memberships.manage", {
        unionId: "union-other",
        localId: "local-9",
      }).allowed,
    ).toBe(true);
    expect(
      decideCapability(actor, "officers.manage", {
        unionId: "union-other",
        localId: "local-9",
      }).allowed,
    ).toBe(true);
  });

  it("keeps union_admin home-union scoped", () => {
    const actor: AuthorizationActor = {
      ...base,
      roles: ["union_admin"],
      memberships: [],
    };
    expect(
      decideCapability(actor, "memberships.manage", {
        unionId: "union-other",
        localId: "local-9",
      }),
    ).toMatchObject({ allowed: false, reason: "union_mismatch" });
  });

  it("requires active local membership before officer capability is applied", () => {
    const actor: AuthorizationActor = { ...base, memberships: [], assignments: [{ unionId: "union-1", localId: "local-1", position: "president" }] };
    expect(decideCapability(actor, "grievances.case.write", { unionId: "union-1", localId: "local-1" })).toMatchObject({
      allowed: false,
      reason: "active_local_membership_required",
    });
  });

  it("bridges role claims into president leadership capabilities", () => {
    const bridged = mergeRoleClaimBridge({
      unionId: "union-1",
      localId: "local-1",
      roles: ["local_president"],
      memberships: [],
      assignments: [],
    });
    const actor: AuthorizationActor = {
      ...base,
      roles: ["local_president"],
      memberships: bridged.memberships,
      assignments: bridged.assignments,
      source: "database",
    };
    expect(
      decideCapability(actor, "memberships.manage", {
        unionId: "union-1",
        localId: "local-1",
      }),
    ).toMatchObject({ allowed: true, reason: "active_officer_assignment" });
    expect(
      decideCapability(actor, "officers.manage", {
        unionId: "union-1",
        localId: "local-1",
      }).allowed,
    ).toBe(true);
    expect(
      decideCapability(actor, "memberships.manage", {
        unionId: "union-1",
        localId: "local-sister",
      }),
    ).toMatchObject({ allowed: false, reason: "active_local_membership_required" });
  });

  it("does not invent a local when the user row has none", () => {
    expect(
      relationshipsFromRoleClaims({
        unionId: "union-1",
        localId: "local-1",
        roles: ["local_president"],
      }).assignments.map((a) => a.position),
    ).toEqual(["president"]);
    expect(
      mergeRoleClaimBridge({
        unionId: "union-1",
        localId: null,
        roles: ["local_president"],
        memberships: [],
        assignments: [],
      }),
    ).toEqual({ memberships: [], assignments: [] });
  });
});
