import { describe, expect, it } from "vitest";
import { resolveCircleCreate } from "./circle-create";

describe("resolveCircleCreate", () => {
  it("stamps the session local by default", () => {
    const result = resolveCircleCreate({ sessionLocalId: "local-243" });
    expect(result).toEqual({
      ok: true,
      kind: "committee",
      visibility: "invited",
      localId: "local-243",
    });
  });

  it("omits localId for a union-scoped invited committee", () => {
    const result = resolveCircleCreate({
      scope: "union",
      sessionLocalId: "local-243",
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
      sessionLocalId: "local-243",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects local_members visibility without a single local", () => {
    const result = resolveCircleCreate({
      scope: "union",
      visibility: "local_members",
      sessionLocalId: "local-243",
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
