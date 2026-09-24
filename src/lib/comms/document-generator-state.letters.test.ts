import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { LETTER_PRESET_IDS } from "./document-generator-draft";
import { hydrateGeneratorState } from "./document-generator-state";
import type { BrandKit } from "@/types/entities";

const emptyBrand = {
  local: { localNumber: "" },
  logos: {},
  colors: {},
  canvas: {},
} as BrandKit;

describe("hydrateGeneratorState letters variant", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: () =>
        JSON.stringify({
          presetId: "seniority-worksheet",
          includeDocx: true,
          includeXlsx: true,
          includePptx: false,
          includeIcs: false,
          includeLogo: false,
          showQr: false,
          qrLinkId: "",
          salutationPresetId: "dearMember",
          topMargin: "standard",
          letterSpacing: "normal",
          headerSize: "standard",
          typeScaleOverride: "inherit",
          fields: { body: "stored" },
        }),
      setItem: () => undefined,
      removeItem: () => undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("coerces a non-letter stored draft when allowedPresets is letters-only", () => {
    const state = hydrateGeneratorState("welcome-letter", emptyBrand, {
      allowedPresets: LETTER_PRESET_IDS,
    });
    expect(LETTER_PRESET_IDS).toContain(state.presetId);
    expect(state.presetId).toBe("welcome-letter");
  });
});
