import { describe, expect, it } from "vitest";
import { resolveCustomization } from "@/lib/customization/resolve";
import { bilingual, block, brand, guide, input, patch, source } from "@/lib/customization/fixtures.test-support";
import { COMPILED_DEFAULTS } from "@/lib/customization/defaults";
import type { CustomizationResource, ResolutionResult } from "@/lib/customization/types";

function resolved(result: ResolutionResult) {
  if (result.status !== "resolved") throw new Error(`Expected resolved, got ${result.status}`);
  return result;
}
function resolvedGuide(result: ResolutionResult) {
  const payload = resolved(result).resource.payload;
  if (payload.kind !== "guide") throw new Error("Expected guide");
  return payload;
}

describe("customization compiler resolution", () => {
  it("uses compiled defaults without context and does not mutate inputs", () => {
    const args = { ...input(), targetScopeId: undefined };
    const before = JSON.stringify(args);
    const result = resolved(resolveCustomization(args));
    expect(result.resource).toEqual(guide());
    result.resource.policy.enabled = false;
    expect(JSON.stringify(args)).toBe(before);
    expect(resolveCustomization({ ...input(), manifest: COMPILED_DEFAULTS })).toEqual({ status: "missing" });
  });
  it("merges all layers in hierarchy order, independent of input ordering, with provenance", () => {
    const args = input();
    args.layers = ["system", "alpha", "academic", "alpha-101", "full-time"].reverse().map((scopeId) => patch(scopeId, { kind: "guide", title: { op: "set", value: bilingual(scopeId) }, blocks: [{ op: "add", value: block(scopeId) }] }));
    const result = resolved(resolveCustomization(args));
    expect(resolvedGuide(result).title.en).toBe("full-time");
    expect(resolvedGuide(result).blocks.map((entry) => entry.id)).toEqual(["prepare", "meeting", "system", "alpha", "academic", "alpha-101", "full-time"]);
    expect(result.provenance["field:title"]).toEqual({ scopeId: "full-time", revisionId: "revision-full-time" });
    expect(result.provenance["block:academic"].scopeId).toBe("academic");
    expect(result.manifestVersion).toBe("1");
  });
  it("inherits through absent and explicitly inherited levels", () => {
    const args = input();
    args.layers = [patch("alpha", { kind: "guide", title: { op: "set", value: bilingual("Union title") } }), { schemaVersion: 1, key: args.key, scopeId: "academic", revisionId: "inherit-v2", mode: "inherit" }];
    expect(resolvedGuide(resolveCustomization(args)).title.en).toBe("Union title");
  });
  it("uses identical behavior for another union without a division", () => {
    const args = { ...input(), targetScopeId: "beta-101", layers: [patch("beta-101", { kind: "guide", title: { op: "set", value: bilingual("Beta local 101") } })] };
    expect(resolvedGuide(resolveCustomization(args)).title.en).toBe("Beta local 101");
    expect(resolvedGuide(resolveCustomization(input())).title.en).toBe("Generic meeting");
  });
  it.each(["beta", "beta-101", "support", "alpha-102", "part-time"])("rejects off-chain override %s", (scopeId) => {
    expect(() => resolveCustomization({ ...input(), layers: [patch(scopeId, { kind: "guide" })] })).toThrow("outside");
  });
  it("rejects duplicate layers, resource mismatches, and forged no-context layers", () => {
    const layer = patch("alpha", { kind: "guide" });
    expect(() => resolveCustomization({ ...input(), layers: [layer, layer] })).toThrow("Multiple");
    expect(() => resolveCustomization({ ...input(), layers: [{ ...layer, key: "guide:other" }] })).toThrow("outside");
    expect(() => resolveCustomization({ ...input(), targetScopeId: undefined, layers: [layer] })).toThrow("outside");
  });
  it("withdrawal is an explicit deny, not fallback, and cannot be undone by a child", () => {
    const args = input();
    args.layers = [{ schemaVersion: 1, key: args.key, scopeId: "alpha", revisionId: "withdraw-v2", mode: "withdraw" }, patch("academic", { kind: "guide" }, { enabled: true })];
    expect(resolveCustomization(args)).toEqual({ status: "unavailable", reason: "withdrawn", origin: { scopeId: "alpha", revisionId: "withdraw-v2" } });
  });
  it("disabled ancestors cannot be enabled by a child", () => {
    expect(resolveCustomization({ ...input(), layers: [patch("alpha", { kind: "guide" }, { enabled: false }), patch("academic", { kind: "guide" }, { enabled: true })] }).status).toBe("unavailable");
  });
  it("tightens audience and intersects editable fields", () => {
    const args = { ...input(), layers: [patch("alpha", { kind: "guide" }, { audience: "verified_member", editableFields: ["title"] }), patch("academic", { kind: "guide" }, { audience: "public", editableFields: ["title", "blocks"] })] };
    expect(resolved(resolveCustomization(args)).resource.policy).toEqual({ audience: "verified_member", enabled: true, editableFields: ["title"] });
    expect(resolved(resolveCustomization(args)).provenance["policy:audience"].scopeId).toBe("alpha");
  });
  it("replaces and reorders by stable ID while preserving member-only sections", () => {
    const args = { ...input(), layers: [patch("alpha", { kind: "guide", blocks: [{ op: "replace", value: block("meeting", "public") }, { op: "order", ids: ["meeting", "prepare"] }] })] };
    expect(resolvedGuide(resolveCustomization(args)).blocks.map((entry) => [entry.id, entry.audience])).toEqual([["meeting", "verified_member"], ["prepare", "public"]]);
  });
  it("does not loosen a removed then re-added section", () => {
    const args = { ...input(), layers: [patch("alpha", { kind: "guide", blocks: [{ op: "remove", id: "meeting" }] }), patch("academic", { kind: "guide", blocks: [{ op: "add", value: block("meeting") }] })] };
    expect(resolvedGuide(resolveCustomization(args)).blocks[1].audience).toBe("verified_member");
  });
  it.each([
    [{ op: "replace", value: block("missing") }],
    [{ op: "remove", id: "missing" }],
    [{ op: "add", value: block("prepare") }],
    [{ op: "order", ids: ["prepare", "prepare"] }],
    [{ op: "order", ids: ["prepare"] }],
    [{ op: "order", ids: ["meeting", "missing"] }],
  ])("rejects orphan/duplicate/invalid-order operations (%j)", (...operations) => {
    expect(() => resolveCustomization({ ...input(), layers: [patch("alpha", { kind: "guide", blocks: operations })] })).toThrow();
  });
  it("rejects a local replacement when its ancestor removed the target", () => {
    const args = { ...input(), layers: [patch("alpha", { kind: "guide", blocks: [{ op: "remove", id: "prepare" }] }), patch("alpha-101", { kind: "guide", blocks: [{ op: "replace", value: block("prepare") }] })] };
    expect(() => resolveCustomization(args)).toThrow("Orphan replacement");
  });
  it("supports nullable brand clear without resetting other defaults", () => {
    const args = input(brand());
    args.layers = [{ ...patch("alpha", { kind: "brand", logoAssetId: { op: "clear" } }), key: args.key }];
    const payload = resolved(resolveCustomization(args)).resource.payload;
    expect(payload).toMatchObject({ logoAssetId: null, primaryColor: "#112233" });
    expect(resolved(resolveCustomization(input(brand()))).resource.payload).toMatchObject({ logoAssetId: "logo-original" });
  });
  it("defines a new scoped guide only when no inherited definition exists", () => {
    const args = input();
    args.manifest = COMPILED_DEFAULTS;
    args.layers = [{ schemaVersion: 1, key: args.key, scopeId: "alpha", revisionId: "v1", mode: "define", resource: guide() }];
    expect(resolveCustomization(args).status).toBe("resolved");
    expect(() => resolveCustomization({ ...args, manifest: input().manifest })).toThrow("typed patch");
    expect(() => resolveCustomization({ ...args, layers: [patch("alpha", { kind: "guide" })] })).toThrow("absent");
  });
  it("replaces whole workflows without retaining old deadline steps", () => {
    const workflow: CustomizationResource = { schemaVersion: 1, key: "workflow:grievance", policy: guide().policy, payload: { kind: "workflow", workflowId: "grievance", effectiveFrom: "2026-09-22", steps: [{ id: "initial", number: 1, name: bilingual("Initial"), responseDays: 5 }, { id: "appeal", number: 2, name: bilingual("Appeal"), responseDays: 10 }] } };
    const replacement = { kind: "workflow", workflowId: "grievance", effectiveFrom: "2026-10-01", steps: [{ id: "initial", number: 1, name: bilingual("Initial"), responseDays: 7 }] };
    const args = { ...input(workflow), layers: [{ ...patch("full-time", { kind: "workflow", replacement }), key: workflow.key }] };
    expect(resolved(resolveCustomization(args)).resource.payload).toEqual(replacement);
    expect(() => resolveCustomization({ ...input(workflow), layers: [{ ...patch("full-time", { kind: "workflow", replacement: { ...replacement, steps: [{ ...replacement.steps[0], number: 2 }] } }), key: workflow.key }] })).toThrow("consecutive");
  });
  it("validates pinned sources, tenant context and consuming section audience", () => {
    const resource = guide();
    if (resource.payload.kind !== "guide") throw new Error("Fixture");
    resource.payload.sources = [{ id: "source:reference", revisionId: "source-v1" }];
    resource.payload.blocks[0].sourceIds = ["source:reference"];
    const args = { ...input(resource), sourceDependencies: [source()] };
    expect(resolveCustomization(args).status).toBe("resolved");
    expect(() => resolveCustomization({ ...args, sourceDependencies: [] })).toThrow("pinned");
    expect(() => resolveCustomization({ ...args, sourceDependencies: [{ ...source(), revisionId: "source-v2" }] })).toThrow("pinned");
    expect(() => resolveCustomization({ ...args, sourceDependencies: [{ ...source(), scopeId: "beta" }] })).toThrow("outside");
    expect(() => resolveCustomization({ ...args, sourceDependencies: [{ ...source(), audience: "local_officer" }] })).toThrow("restricted");
  });
  it("validates source add/replace/remove operations and rejects dangling block citations", () => {
    const ref = { id: "source:reference", revisionId: "source-v1" };
    const args = { ...input(), sourceDependencies: [source()], layers: [patch("alpha", { kind: "guide", sources: [{ op: "add", value: ref }], blocks: [{ op: "replace", value: { ...block("prepare"), sourceIds: [ref.id] } }] })] };
    expect(resolveCustomization(args).status).toBe("resolved");
    expect(() => resolveCustomization({ ...args, layers: [...args.layers, patch("academic", { kind: "guide", sources: [{ op: "remove", id: ref.id }] })] })).toThrow("Dangling");
    expect(resolveCustomization({ ...args, sourceDependencies: [{ ...source(), revisionId: "source-v2" }], layers: [...args.layers, patch("academic", { kind: "guide", sources: [{ op: "replace", value: { ...ref, revisionId: "source-v2" } }] })] }).status).toBe("resolved");
  });
  it("surfaces malformed data instead of treating it as missing customization", () => {
    expect(() => resolveCustomization({ ...input(), layers: [null] })).toThrow();
    expect(() => resolveCustomization({ ...input(), layers: [patch("alpha", { kind: "brand", logoAssetId: { op: "clear" } })] })).toThrow("kind");
  });
  it("resolves registered tool configurations and source replacements as whole values", () => {
    const tool: CustomizationResource = { schemaVersion: 1, key: "tool:rules-of-order", policy: guide().policy, payload: { kind: "tool", configuration: { toolId: "rules-of-order", initialCategory: "all", initialAction: "mainMotion" } } };
    const configuration = { toolId: "rules-of-order", initialCategory: "meeting", initialAction: "adjourn" };
    expect(resolved(resolveCustomization({ ...input(tool), layers: [{ ...patch("alpha", { kind: "tool", configuration }), key: tool.key }] })).resource.payload).toEqual({ kind: "tool", configuration });
    const reference: CustomizationResource = { schemaVersion: 1, key: source().id, policy: guide().policy, payload: source().payload };
    const replacement = { ...source().payload, url: "https://example.org/new-guide" };
    const result = resolved(resolveCustomization({ ...input(reference), layers: [{ ...patch("alpha", { kind: "source", replacement }), key: reference.key }] }));
    expect(result.resource.payload).toEqual(replacement);
    expect(result.provenance["field:url"].scopeId).toBe("alpha");
  });
  it("rejects duplicate blocks and source references in compiled definitions", () => {
    const resource = guide();
    if (resource.payload.kind !== "guide") throw new Error("Fixture");
    resource.payload.blocks.push(block("prepare"));
    expect(() => resolveCustomization(input(resource))).toThrow("Duplicate block");
    resource.payload.blocks.pop();
    resource.payload.sources = [{ id: "source:reference", revisionId: "v1" }, { id: "source:reference", revisionId: "v2" }];
    expect(() => resolveCustomization(input(resource))).toThrow("Duplicate source");
  });
  it("enforces the merged 100-block bound, even when each patch is individually small", () => {
    const resource = guide();
    if (resource.payload.kind !== "guide") throw new Error("Fixture");
    resource.payload.blocks = Array.from({ length: 100 }, (_, index) => block(`block-${index}`));
    expect(() => resolveCustomization({ ...input(resource), layers: [patch("alpha", { kind: "guide", blocks: [{ op: "add", value: block("overflow") }] })] })).toThrow();
  });
});
