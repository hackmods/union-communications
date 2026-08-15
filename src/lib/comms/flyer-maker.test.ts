import { describe, expect, it } from "vitest";
import {
  DEFAULT_FLYER_FORMAT,
  FLYER_FORMAT_ORDER,
  FLYER_FORMATS,
  isFlyerFormatId,
} from "@/lib/comms/flyer-formats";
import {
  DEFAULT_FLYER_FONT,
  FLYER_FONT_ORDER,
  canvasFontFamily,
  flyerFontFamily,
  isFlyerFontStackId,
  migrateFlyerFontChoice,
} from "@/lib/comms/flyer-fonts";
import {
  DEFAULT_FLYER_LAYOUT,
  FLYER_LAYOUT_ORDER,
  flyerLayoutSupportsPhoto,
  isFlyerLayoutId,
} from "@/lib/comms/flyer-layouts";
import {
  FLYER_PRESET_ORDER,
  FLYER_PRESETS,
  isFlyerPresetKey,
} from "@/lib/comms/flyer-presets";
import { fieldsFromFlyer } from "@/lib/comms/event-email-from-flyer";
import { resolveFlyerTokens } from "@/lib/comms/flyer-tokens";
import type { BrandKit } from "@/types/entities";

const kit = {
  version: "2.0",
  local: { id: "local-1", localNumber: "243", subText: "Test" },
  primaryColor: "#003366",
  secondaryColor: "#FF6600",
  accentColor: "#FFFFFF",
  useOfficialLogo: false,
  updatedAt: "2026-08-14",
} as BrandKit;

describe("flyer-formats", () => {
  it("exposes letter, half-letter, and tabloid with PDF inches", () => {
    expect(FLYER_FORMAT_ORDER).toEqual(["letter", "halfLetter", "tabloid"]);
    expect(FLYER_FORMATS.letter.widthInches).toBe(8.5);
    expect(FLYER_FORMATS.letter.aspectRatio).toBe("8.5 / 11");
    expect(FLYER_FORMATS.halfLetter.heightInches).toBe(8.5);
    expect(FLYER_FORMATS.tabloid.widthInches).toBe(11);
    expect(isFlyerFormatId(DEFAULT_FLYER_FORMAT)).toBe(true);
    expect(isFlyerFormatId("a4")).toBe(false);
  });
});

describe("flyer-fonts", () => {
  it("defaults to inherit Brand Kit and maps catalog ids", () => {
    expect(DEFAULT_FLYER_FONT).toBe("inherit");
    expect(FLYER_FONT_ORDER[0]).toBe("inherit");
    expect(flyerFontFamily("inherit")).toBe(canvasFontFamily("montserrat"));
    expect(flyerFontFamily("oswald")).toContain("var(--font-oswald)");
    expect(migrateFlyerFontChoice("impact")).toBe("oswald");
    expect(isFlyerFontStackId(DEFAULT_FLYER_FONT)).toBe(true);
    expect(isFlyerFontStackId("comic")).toBe(false);
  });
});

describe("flyer-layouts", () => {
  it("supports photo on split and photoHero only", () => {
    expect(FLYER_LAYOUT_ORDER).toContain(DEFAULT_FLYER_LAYOUT);
    expect(flyerLayoutSupportsPhoto("stack")).toBe(false);
    expect(flyerLayoutSupportsPhoto("band")).toBe(false);
    expect(flyerLayoutSupportsPhoto("split")).toBe(true);
    expect(flyerLayoutSupportsPhoto("photoHero")).toBe(true);
    expect(isFlyerLayoutId("photoHero")).toBe(true);
    expect(isFlyerLayoutId("hero")).toBe(false);
  });
});

describe("flyer-presets", () => {
  it("covers picket, rally, meeting, and walkabout starters", () => {
    expect(FLYER_PRESET_ORDER).toEqual([
      "picket",
      "rally",
      "meeting",
      "walkabout",
    ]);
    expect(FLYER_PRESETS.walkabout.format).toBe("halfLetter");
    expect(FLYER_PRESETS.picket.fontStack).toBe("oswald");
    expect(FLYER_PRESETS.meeting.fontStack).toBe("sourceSerif");
    expect(FLYER_PRESETS.walkabout.fontStack).toBe("barlowCondensed");
    expect(isFlyerPresetKey("rally")).toBe(true);
    expect(isFlyerPresetKey("strike")).toBe(false);
  });
});

describe("fieldsFromFlyer", () => {
  it("maps flyer fields into EventEmailFields", () => {
    expect(
      fieldsFromFlyer({
        message: "Rally",
        date: "Sat",
        time: "noon",
        location: "Hall",
        contact: "Steward",
        body: "Bring a sign",
      }),
    ).toEqual({
      title: "Rally",
      subtitle: "Bring a sign",
      date: "Sat",
      time: "noon",
      location: "Hall",
      contactName: "Steward",
    });
  });
});

describe("resolveFlyerTokens", () => {
  it("applies headline case and densifies half-letter", () => {
    const letter = resolveFlyerTokens(kit, {
      typeScaleOverride: "display",
      headlineCase: "uppercase",
      format: "letter",
    });
    const half = resolveFlyerTokens(kit, {
      typeScaleOverride: "display",
      headlineCase: "asTyped",
      format: "halfLetter",
    });
    expect(letter.titleTextTransform).toBe("uppercase");
    expect(half.titleTextTransform).toBe("none");
    expect(half.titleFontSizePx).toBeLessThan(letter.titleFontSizePx);
    expect(half.paddingPx).toBeLessThan(letter.paddingPx);
  });
});
