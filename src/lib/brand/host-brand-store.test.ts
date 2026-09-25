import { describe, expect, it, afterEach } from "vitest";
import {
  resolveHostBrandWithOverlay,
  resetHostBrandStoreForTests,
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
