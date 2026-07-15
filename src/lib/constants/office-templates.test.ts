import { describe, expect, it } from "vitest";
import {
  defaultFieldsForPreset,
  getPreset,
  OFFICE_PRESETS,
  paletteForColorKey,
  presetsByTier,
  resolveOfficeTemplateUrls,
} from "./office-templates";

describe("office-templates", () => {
  it("lists quick starts and campaign packs", () => {
    expect(presetsByTier("quick").map((p) => p.id)).toEqual([
      "letterhead",
      "simple-letter",
    ]);
    expect(presetsByTier("pack")).toHaveLength(3);
    expect(OFFICE_PRESETS).toHaveLength(5);
  });

  it("resolves color-variant template URLs", () => {
    const preset = getPreset("quick-event");
    expect(resolveOfficeTemplateUrls(preset, "red")).toEqual({
      docx: "/templates/office/docx/quick-event_red.docx",
      xlsx: "/templates/office/xlsx/quick-event_red.xlsx",
    });
  });

  it("omits xlsx for letterhead and simple-letter", () => {
    expect(resolveOfficeTemplateUrls(getPreset("letterhead"), "brand")).toEqual({
      docx: "/templates/office/docx/letterhead_brand.docx",
      xlsx: undefined,
    });
    expect(
      resolveOfficeTemplateUrls(getPreset("simple-letter"), "blue"),
    ).toEqual({
      docx: "/templates/office/docx/simple-letter_blue.docx",
      xlsx: undefined,
    });
  });

  it("builds default field map from preset", () => {
    const fields = defaultFieldsForPreset(getPreset("formal-grievance"));
    expect(fields.memberName).toBeTruthy();
    expect(fields.body).toBeTruthy();
  });

  it("uses Brand Kit for brand colour key", () => {
    const palette = paletteForColorKey("brand", {
      primary: "#111111",
      secondary: "#222222",
      accent: "#333333",
    });
    expect(palette.primary).toBe("#111111");
  });

  it("uses fixed chrome for red/blue", () => {
    const red = paletteForColorKey("red", {
      primary: "#000",
      secondary: "#000",
      accent: "#000",
    });
    expect(red.primary).toBe("#9E1B32");
  });
});
