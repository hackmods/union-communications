import { describe, expect, it } from "vitest";
import { resolvePresentationScopes } from "@/lib/customization/presentation-context";

describe("presentation context", () => {
  it("stays on system when no preset is selected", () => {
    expect(resolvePresentationScopes()).toMatchObject({
      targetScopeId: "system",
      unionId: null,
    });
  });

  it("maps a known tenant slug preset to a union scope chain", () => {
    const resolved = resolvePresentationScopes({ presetId: "b7p" });
    expect(resolved.unionId).toBe("union-b7p");
    expect(resolved.targetScopeId).toBe("union-union-b7p");
    expect(resolved.scopes.map((scope) => scope.kind)).toEqual(["system", "union"]);
  });

  it("falls back to system for an unknown preset without inventing a tenant", () => {
    const resolved = resolvePresentationScopes({ presetId: "not-a-real-union" });
    expect(resolved).toMatchObject({
      targetScopeId: "system",
      unionId: null,
      presetId: "not-a-real-union",
    });
  });
});
