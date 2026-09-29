import { describe, expect, it } from "vitest";
import {
  brandCollectiveOptionsForPreset,
  brandCollectionOptionsForPreset,
} from "@/lib/site-admin/brand-structure-options";

describe("brandCollectiveOptionsForPreset", () => {
  it("returns OPSEU sector and division suggestions for the opseu preset", () => {
    const options = brandCollectiveOptionsForPreset("opseu");
    expect(options.length).toBeGreaterThan(2);
    expect(options.some((row) => row.code === "support")).toBe(true);
    expect(options.some((row) => row.code === "caat-support")).toBe(true);
    expect(options.every((row) => row.code && row.name)).toBe(true);
  });

  it("returns empty when the preset has no collective catalog", () => {
    expect(brandCollectiveOptionsForPreset("cupe")).toEqual([]);
    expect(brandCollectiveOptionsForPreset(null)).toEqual([]);
  });
});

describe("brandCollectionOptionsForPreset", () => {
  it("returns collection codes for OPSEU", () => {
    const options = brandCollectionOptionsForPreset("opseu");
    expect(options.some((row) => row.code === "support")).toBe(true);
    expect(options.some((row) => row.code === "ft")).toBe(true);
  });

  it("returns empty for unbound or other presets", () => {
    expect(brandCollectionOptionsForPreset(null)).toEqual([]);
    expect(brandCollectionOptionsForPreset("other")).toEqual([]);
  });
});
