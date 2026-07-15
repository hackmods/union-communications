import { describe, expect, it } from "vitest";
import {
  OFFICE_PRESETS,
  brandPalette,
  defaultFieldsForPreset,
  getPreset,
} from "./office-templates";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";

describe("office-templates", () => {
  it("ships exactly three high-quality presets", () => {
    expect(OFFICE_PRESETS.map((p) => p.id)).toEqual([
      "simple-letter",
      "letterhead",
      "quick-event",
    ]);
  });

  it("maps Brand Kit to palette", () => {
    expect(
      brandPalette({
        ...DEFAULT_BRAND_KIT,
        primaryColor: "#112233",
        secondaryColor: "#445566",
        accentColor: "#778899",
      }),
    ).toEqual({
      primary: "#112233",
      secondary: "#445566",
      accent: "#778899",
    });
  });

  it("builds default fields", () => {
    const fields = defaultFieldsForPreset(getPreset("simple-letter"));
    expect(fields.memberName).toBeTruthy();
    expect(fields.body).toBeTruthy();
  });

  it("event preset includes xlsx", () => {
    expect(getPreset("quick-event").outputs.xlsx).toBe(true);
    expect(getPreset("simple-letter").outputs.xlsx).toBe(false);
  });
});
