import { describe, expect, it } from "vitest";
import { MAX_DOCUMENT_BYTES, parseBounded, patchSchema, resourceSchema, sourcePayloadSchema } from "@/lib/customization/schemas";
import { parseDefaultsManifest } from "@/lib/customization/defaults";
import { brand, guide, source } from "@/lib/customization/fixtures.test-support";

describe("customization schemas", () => {
  it("validates bilingual typed content and strips no unknown input silently", () => {
    expect(resourceSchema.parse(guide())).toEqual(guide());
    expect(() => resourceSchema.parse({ ...guide(), unknown: true })).toThrow();
    expect(() => resourceSchema.parse({ ...guide(), schemaVersion: 2 })).toThrow();
  });
  it.each(["javascript:alert(1)", "data:text/html,hi", "https://user:password@example.org", "//example.org", "http://example.org"])("rejects unsafe source URL %s", (url) => {
    expect(sourcePayloadSchema.safeParse({ ...source().payload, url }).success).toBe(false);
  });
  it("rejects executable blocks and unknown block fields", () => {
    const resource = guide();
    if (resource.payload.kind !== "guide") throw new Error("Fixture");
    const payload = resource.payload;
    expect(() => resourceSchema.parse({ ...resource, payload: { ...payload, blocks: [{ id: "script", type: "html", html: "<script>alert(1)</script>" }] } })).toThrow();
    expect(() => resourceSchema.parse({ ...resource, payload: { ...payload, blocks: [{ ...payload.blocks[0], html: "<b>hello</b>" }] } })).toThrow();
  });
  it("requires both locales and forbids null on required fields", () => {
    expect(() => patchSchema.parse({ kind: "guide", title: { op: "set", value: { en: "English only" } } })).toThrow();
    expect(() => patchSchema.parse({ kind: "guide", title: { op: "clear" } })).toThrow();
    expect(() => patchSchema.parse({ kind: "brand", primaryColor: { op: "set", value: null } })).toThrow();
  });
  it("limits brand values to bundled fonts, colors and asset IDs", () => {
    const resource = brand();
    expect(() => resourceSchema.parse({ ...resource, payload: { ...resource.payload, headlineFontId: "https://example.org/font.woff" } })).toThrow();
    expect(() => patchSchema.parse({ kind: "brand", primaryColor: { op: "set", value: "var(--color)" } })).toThrow();
    expect(() => patchSchema.parse({ kind: "brand", localNumber: { op: "set", value: "101" } })).toThrow();
  });
  it("only admits a registered tool's approved defaults", () => {
    expect(patchSchema.parse({ kind: "tool", configuration: { toolId: "rules-of-order", initialCategory: "all", initialAction: "adjourn" } })).toBeTruthy();
    expect(() => patchSchema.parse({ kind: "tool", configuration: { toolId: "remote-plugin", code: "run()" } })).toThrow();
    expect(() => patchSchema.parse({ kind: "tool", configuration: { toolId: "rules-of-order", initialCategory: "all", initialAction: "adjourn", enabledModules: ["grievance"] } })).toThrow();
    expect(() => patchSchema.parse({ kind: "tool", configuration: { toolId: "rules-of-order", initialCategory: "points", initialAction: "adjourn" } })).toThrow();
  });
  it("bounds JSON by UTF-8 bytes and rejects malformed/cyclic inputs", () => {
    expect(() => parseBounded(resourceSchema, { body: "é".repeat(MAX_DOCUMENT_BYTES / 2) })).toThrow("size limit");
    expect(() => parseBounded(resourceSchema, undefined)).toThrow();
    const cyclic: { self?: unknown } = {}; cyclic.self = cyclic;
    expect(() => parseBounded(resourceSchema, cyclic)).toThrow();
  });
  it("validates manifests, including key/kind correspondence and duplicate resources", () => {
    expect(() => parseDefaultsManifest({ version: "1", resources: [guide(), guide()] })).toThrow("Duplicate");
    expect(() => parseDefaultsManifest({ version: "1", resources: [{ ...guide(), key: "source:wrong" }] })).toThrow("mismatch");
  });
});
