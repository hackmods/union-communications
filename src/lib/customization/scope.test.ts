import { describe, expect, it } from "vitest";
import { resolveScopeChain } from "@/lib/customization/scope";
import { scopes } from "@/lib/customization/fixtures.test-support";

describe("customization scope hierarchy", () => {
  it("resolves all five levels independently of record order", () => {
    expect(resolveScopeChain([...scopes].reverse(), "full-time").map((scope) => scope.id)).toEqual(["system", "alpha", "academic", "alpha-101", "full-time"]);
  });
  it("omits a division only for a local without that relationship", () => {
    expect(resolveScopeChain(scopes, "beta-101").map((scope) => scope.id)).toEqual(["system", "beta", "beta-101"]);
  });
  it("defaults to the system without guessing the first union", () => {
    expect(resolveScopeChain(scopes).map((scope) => scope.id)).toEqual(["system"]);
  });
  it.each(["unknown", "", "101"])("rejects unknown IDs and local numbers: %s", (target) => {
    expect(() => resolveScopeChain(scopes, target)).toThrow();
  });
  it.each([
    ["full-time", { localId: "local-alpha-102" }],
    ["full-time", { unionId: "union-beta" }],
    ["full-time", { divisionId: "division-support" }],
    ["alpha-101", { parentScopeId: "support" }],
    ["alpha-101", { parentScopeId: "alpha" }],
    ["academic", { parentScopeId: "system" }],
    ["academic", { parentScopeId: "full-time" }],
    ["academic", { parentScopeId: "missing" }],
    ["academic", { archived: true }],
    ["system", { unionId: "union-alpha" }],
  ])("rejects mismatched, archived or cyclic ancestors (%s)", (id, change) => {
    const altered = scopes.map((scope) => scope.id === id ? { ...scope, ...change } : scope);
    expect(() => resolveScopeChain(altered, "full-time")).toThrow();
  });
  it("rejects duplicate IDs and ambiguous roots", () => {
    expect(() => resolveScopeChain([...scopes, scopes[0]])).toThrow("Duplicate");
    expect(() => resolveScopeChain([...scopes, { kind: "system", id: "another-system" }])).toThrow();
    expect(() => resolveScopeChain([...scopes, { ...scopes[1], id: "alias-alpha" }])).toThrow("identity");
  });
});
