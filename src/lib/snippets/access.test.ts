import { describe, expect, it } from "vitest";
import type { AuthorizationActor } from "@/lib/authorization/model";
import { canAccessSnippetLocalScope, canCreateSnippetInScope, canManageSnippet, canViewSnippet } from "@/lib/snippets/access";
import type { CaSnippet } from "@/types/qol";

const memberActor: AuthorizationActor = {
  userId: "member-1",
  unionId: "union-1",
  activeLocalId: "local-1",
  bargainingUnitId: "unit-1",
  roles: ["local_steward"],
  memberships: [{ unionId: "union-1", localId: "local-1", bargainingUnitId: "unit-1", isPrimary: true }],
  assignments: [],
  delegations: [],
  circleMemberships: [],
  mfaVerified: true,
  accountActive: true,
  source: "database",
};

function snippet(overrides: Partial<CaSnippet> = {}): CaSnippet {
  return {
    id: "snippet-1",
    unionId: "union-1",
    localId: "local-1",
    locale: "en",
    title: "Clause",
    clauseRef: "Article 1",
    body: "Text",
    tags: [],
    createdById: "member-1",
    createdByName: "Member",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("CA snippet access follows active membership and local ownership", () => {
  it("requires an active local relationship for a local actor", () => {
    expect(canAccessSnippetLocalScope(memberActor, "local-1")).toBe(true);
    expect(canAccessSnippetLocalScope(memberActor, undefined)).toBe(false);
    expect(canViewSnippet(memberActor, snippet({ localId: "local-2" }))).toBe(false);
    expect(canCreateSnippetInScope(memberActor, "local-2", "unit-1")).toBe(false);
  });

  it("allows local reading of shared entries but restricts shared-entry management", () => {
    const shared = snippet({ localId: undefined });
    expect(canViewSnippet(memberActor, shared)).toBe(true);
    expect(canManageSnippet(memberActor, shared)).toBe(false);
    expect(canCreateSnippetInScope(memberActor, "local-1", "unit-1")).toBe(true);
    expect(canCreateSnippetInScope(memberActor, "local-1", "unit-2")).toBe(false);
  });

  it("allows cross-local administrators only within the same union", () => {
    const admin: AuthorizationActor = { ...memberActor, activeLocalId: undefined, memberships: [], roles: ["union_admin"] };
    expect(canViewSnippet(admin, snippet({ localId: "local-2" }))).toBe(true);
    expect(canManageSnippet(admin, snippet({ localId: undefined }))).toBe(true);
    expect(canViewSnippet(admin, snippet({ unionId: "union-2" }))).toBe(false);
  });
});
