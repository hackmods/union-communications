import { describe, expect, it } from "vitest";
import { HERO_PREVIEW_HREF, HERO_PREVIEW_VARIANTS } from "@/lib/comms/home-hero-preview";

describe("home hero previews", () => {
  it("offers a stable tool destination for each visitor-selected example", () => {
    expect(HERO_PREVIEW_VARIANTS).toEqual(["boardNotice", "graphicMaker", "flyerMaker"]);
    expect(HERO_PREVIEW_HREF).toEqual({
      boardNotice: "/create/board-notice",
      graphicMaker: "/create/graphic-maker",
      flyerMaker: "/create/flyer-maker",
    });
  });
});
