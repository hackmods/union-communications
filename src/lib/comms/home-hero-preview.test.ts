import { describe, expect, it, vi } from "vitest";
import {
  HERO_PREVIEW_VARIANTS,
  pickHeroPreviewVariant,
} from "@/lib/comms/home-hero-preview";

describe("pickHeroPreviewVariant", () => {
  it("returns one of the known variants", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(pickHeroPreviewVariant()).toBe("flyerMaker");

    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(pickHeroPreviewVariant()).toBe("boardNotice");

    vi.spyOn(Math, "random").mockRestore();
  });

  it("covers every variant across the random range", () => {
    const seen = new Set<string>();
    for (let i = 0; i < HERO_PREVIEW_VARIANTS.length * 20; i++) {
      seen.add(pickHeroPreviewVariant());
    }
    expect(seen.size).toBe(HERO_PREVIEW_VARIANTS.length);
  });
});
