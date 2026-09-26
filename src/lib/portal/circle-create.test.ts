import { describe, expect, it } from "vitest";
import { canCreateUnionScopedCircle, resolveCircleCreate } from "./circle-create";
import type { AuthorizationActor } from "@/lib/authorization/model";

describe("resolveCircleCreate", () => {
  it("stamps the session local by default", () => {
    const result = resolveCircleCreate({ sessionLocalId: "local-7" });
    expect(result).toEqual({
      ok: true,
      kind: "committee",
      visibility: "invited",
      localId: "local-7",
    });
  });

  it("omits localId for a union-scoped invited committee", () => {
    const result = resolveCircleCreate({
      scope: "union",
      sessionLocalId: "local-7",
      template: "blank",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kind).toBe("committee");
    expect(result.visibility).toBe("invited");
    expect(result.localId).toBeUndefined();
  });

  it("rejects Hall creates on the committee route", () => {
    const result = resolveCircleCreate({
      kind: "local_hall",
      sessionLocalId: "local-7",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects local_members visibility without a single local", () => {
    const result = resolveCircleCreate({
      scope: "union",
      visibility: "local_members",
      sessionLocalId: "local-7",
    });
    expect(result.ok).toBe(false);
  });

  it("requires a session local when scope is local", () => {
    const result = resolveCircleCreate({ scope: "local" });
    expect(result).toEqual({ ok: false, error: "Local required" });
  });

  it("maps the campaign template to campaign kind", () => {
    const result = resolveCircleCreate({
      scope: "union",
      template: "campaign",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kind).toBe("campaign");
    expect(result.localId).toBeUndefined();
  });
});

describe("canCreateUnionScopedCircle", () => {
  const actor: AuthorizationActor = {
    userId: "president", unionId: "union-1", activeLocalId: "local-1",
    roles: ["local_president"],
    memberships: [{ unionId: "union-1", localId: "local-1", isPrimary: true }],
    assignments: [{ unionId: "union-1", localId: "local-1", position: "president" }],
    delegations: [], circleMemberships: [], mfaVerified: true,
    accountActive: true, source: "database",
  };
  it("lets a local president start an invited union-side group without another local membership", () => {
    expect(canCreateUnionScopedCircle(actor, "union-1")).toBe(true);
    expect(canCreateUnionScopedCircle(actor, "union-2")).toBe(false);
  });
  it("requires active local authority for local officers", () => {
    expect(canCreateUnionScopedCircle({ ...actor, assignments: [] }, "union-1")).toBe(false);
    expect(canCreateUnionScopedCircle({ ...actor, memberships: [] }, "union-1")).toBe(false);
  });
});
