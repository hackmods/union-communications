import { describe, expect, it } from "vitest";
import {
  BARE_MINIMUM_ZONES,
  BOARD_LAYOUT_REFERENCES,
} from "./board-layouts";

describe("board-layouts", () => {
  it("defines the bare-minimum zone set", () => {
    expect(BARE_MINIMUM_ZONES).toEqual([
      "header",
      "socials",
      "healthSafety",
      "lec",
      "events",
    ]);
  });

  it("ships four IRL-inspired reference layouts covering core zones", () => {
    expect(BOARD_LAYOUT_REFERENCES).toHaveLength(4);
    for (const layout of BOARD_LAYOUT_REFERENCES) {
      const ids = new Set(layout.zones.map((z) => z.id));
      expect(ids.has("socials")).toBe(true);
      expect(ids.has("healthSafety")).toBe(true);
      expect(ids.has("lec")).toBe(true);
      expect(ids.has("events")).toBe(true);
    }
  });
});
