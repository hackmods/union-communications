import { describe, expect, it } from "vitest";
import {
  isTrustedUnionPresetId,
  resolvePresetIdFromUnionId,
  resolveTrustedPresetId,
} from "@/lib/brand/union-preset-bridge";

describe("union-preset-bridge", () => {
  it("accepts only UNION_PRESETS ids", () => {
    expect(isTrustedUnionPresetId("opseu")).toBe(true);
    expect(isTrustedUnionPresetId("cupe")).toBe(true);
    expect(isTrustedUnionPresetId("b7p")).toBe(false);
    expect(isTrustedUnionPresetId("")).toBe(false);
    expect(isTrustedUnionPresetId(null)).toBe(false);
  });

  it("prefers an explicit binding over slug", () => {
    expect(
      resolvePresetIdFromUnionId("union-b7p", { boundPresetId: "cupe" }),
    ).toBe("cupe");
  });

  it("ignores untrusted bindings and falls through", () => {
    // B7P slug is not a Comms preset — no binding → null
    expect(
      resolvePresetIdFromUnionId("union-b7p", { boundPresetId: "not-a-preset" }),
    ).toBeNull();
    expect(resolvePresetIdFromUnionId("union-b7p")).toBeNull();
  });

  it("returns null for missing unionId", () => {
    expect(resolvePresetIdFromUnionId(undefined)).toBeNull();
    expect(resolvePresetIdFromUnionId("")).toBeNull();
  });

  it("resolveTrustedPresetId trims and allowlists", () => {
    expect(resolveTrustedPresetId("  opseu  ")).toBe("opseu");
    expect(resolveTrustedPresetId("unknown")).toBeNull();
  });

  it("prefers seed brandDefaults.commsPresetId over untrusted slug", async () => {
    const { setCommsPresetPatch, resetTenantOverlayForTests } = await import(
      "@/lib/tenant/overlay"
    );
    resetTenantOverlayForTests();
    setCommsPresetPatch("union-b7p", "unifor");
    expect(resolvePresetIdFromUnionId("union-b7p")).toBe("unifor");
    setCommsPresetPatch("union-b7p", null);
    expect(resolvePresetIdFromUnionId("union-b7p")).toBeNull();
    resetTenantOverlayForTests();
  });
});
