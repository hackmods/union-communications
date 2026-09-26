import { describe, expect, it, afterEach } from "vitest";
import {
  clearHostBrand,
  hostBrandPatchSchema,
  resolveHostBrandWithOverlay,
  resetHostBrandStoreForTests,
  saveHostBrand,
  setHostBrandOverlay,
} from "@/lib/brand/host-brand-store";

afterEach(() => {
  resetHostBrandStoreForTests();
  delete process.env.NEXT_PUBLIC_BRAND_PRIMARY;
});

describe("resolveHostBrandWithOverlay", () => {
  it("applies overlay when env is unset", () => {
    setHostBrandOverlay({
      primaryColor: "#112233",
      secondaryColor: "#445566",
      accentColor: "#778899",
      localNumber: "42",
      subText: "Workshop",
    });
    const resolved = resolveHostBrandWithOverlay({
      primaryColor: "#CE1126",
      secondaryColor: "#FFFFFF",
      accentColor: "#9B0D1C",
      localNumber: "1",
      subText: "File",
    });
    expect(resolved.primaryColor).toBe("#112233");
    expect(resolved.localNumber).toBe("42");
    expect(resolved.subText).toBe("Workshop");
  });

  it("keeps env colours over overlay", () => {
    process.env.NEXT_PUBLIC_BRAND_PRIMARY = "#003DA5";
    setHostBrandOverlay({
      primaryColor: "#112233",
      secondaryColor: "#445566",
      accentColor: "#778899",
      localNumber: "",
      subText: "Overlay",
    });
    const resolved = resolveHostBrandWithOverlay({
      primaryColor: "#CE1126",
      secondaryColor: "#FFFFFF",
      accentColor: "#9B0D1C",
    });
    expect(resolved.primaryColor).toBe("#003DA5");
    expect(resolved.subText).toBe("Overlay");
  });
});

describe("hostBrandPatchSchema and saveHostBrand", () => {
  afterEach(() => {
    resetHostBrandStoreForTests();
    delete process.env.DATABASE_URL;
  });

  it("rejects short hex, extra keys, and unknown presets", () => {
    expect(
      hostBrandPatchSchema.safeParse({
        primaryColor: "#fff",
        secondaryColor: "#ffffff",
        accentColor: "#000000",
      }).success,
    ).toBe(false);
    expect(
      hostBrandPatchSchema.safeParse({
        primaryColor: "#112233",
        secondaryColor: "#445566",
        accentColor: "#778899",
        extra: true,
      }).success,
    ).toBe(false);
  });

  it("normalizes colours in memory and refuses an untrusted preset", async () => {
    const saved = await saveHostBrand({
      primaryColor: "#abcdef",
      secondaryColor: "#ffffff",
      accentColor: "#000000",
      unionPresetId: "opseu",
      localNumber: " 7 ",
    });
    expect(saved.primaryColor).toBe("#ABCDEF");
    expect(saved.unionPresetId).toBe("opseu");
    expect(saved.localNumber).toBe("7");

    await expect(
      saveHostBrand({
        primaryColor: "#112233",
        secondaryColor: "#445566",
        accentColor: "#778899",
        unionPresetId: "not-a-preset",
      }),
    ).rejects.toThrow("Unknown Comms preset id");
  });

  it("clears the overlay so file/env defaults return", async () => {
    await saveHostBrand({
      primaryColor: "#112233",
      secondaryColor: "#445566",
      accentColor: "#778899",
      localNumber: "42",
    });
    await clearHostBrand();
    const resolved = resolveHostBrandWithOverlay({
      primaryColor: "#CE1126",
      secondaryColor: "#FFFFFF",
      accentColor: "#9B0D1C",
      localNumber: "1",
      subText: "File",
    });
    expect(resolved.primaryColor).toBe("#CE1126");
    expect(resolved.localNumber).toBe("1");
  });
});
