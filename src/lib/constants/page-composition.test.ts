import { describe, expect, it } from "vitest";
import {
  GUIDE_COMPOSITION,
  shellForComposition,
  usesDesktopRail,
} from "@/lib/constants/page-composition";

describe("page-composition", () => {
  it("guide presets map to expected shell + composition", () => {
    expect(GUIDE_COMPOSITION.narrow).toEqual({
      composition: "narrow",
      shell: "read",
    });
    expect(GUIDE_COMPOSITION.playbook).toEqual({
      composition: "sidebar-left",
      shell: "readWide",
    });
    expect(GUIDE_COMPOSITION.hub).toEqual({
      composition: "hub",
      shell: "wide",
    });
  });

  it("shellForComposition respects explicit override", () => {
    expect(shellForComposition("narrow", "wide")).toBe("wide");
    expect(shellForComposition("sidebar-left")).toBe("readWide");
    expect(shellForComposition("hub")).toBe("wide");
  });

  it("usesDesktopRail only for sidebar compositions with rail content", () => {
    expect(usesDesktopRail("narrow", {})).toBe(false);
    expect(usesDesktopRail("sidebar-left", null)).toBe(false);
    expect(usesDesktopRail("sidebar-left", "toc")).toBe(true);
    expect(usesDesktopRail("sidebar-right", "help")).toBe(true);
  });
});
