import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUOTE_LAYOUT,
  QUOTE_LAYOUT_ORDER,
  isQuoteLayoutId,
  quoteLayoutFromQuery,
} from "@/lib/comms/quote-layouts";
import {
  QUOTE_PRESET_ORDER,
  QUOTE_PRESETS,
  isQuotePresetKey,
} from "@/lib/comms/quote-presets";

describe("quote-layouts", () => {
  it("keeps stripe as the workshop default", () => {
    expect(DEFAULT_QUOTE_LAYOUT).toBe("stripe");
    expect(QUOTE_LAYOUT_ORDER).toEqual(["stripe", "centered", "mark"]);
    expect(isQuoteLayoutId("centered")).toBe(true);
    expect(isQuoteLayoutId("band")).toBe(false);
  });

  it("reads ?layout= with a fallback", () => {
    expect(
      quoteLayoutFromQuery(
        { get: (name) => (name === "layout" ? "mark" : null) },
        "stripe",
      ),
    ).toBe("mark");
    expect(quoteLayoutFromQuery({ get: () => null }, "stripe")).toBe("stripe");
    expect(quoteLayoutFromQuery({ get: () => "stack" }, "stripe")).toBe(
      "stripe",
    );
  });
});

describe("quote-presets", () => {
  it("maps each starter to a unique layout", () => {
    expect(QUOTE_PRESET_ORDER).toEqual(["bargaining", "solidarity", "member"]);
    expect(QUOTE_PRESETS.bargaining.layout).toBe("stripe");
    expect(QUOTE_PRESETS.solidarity.layout).toBe("mark");
    expect(QUOTE_PRESETS.member.layout).toBe("centered");
    expect(QUOTE_PRESETS.member.aspect).toBe("portrait");
    expect(isQuotePresetKey("bargaining")).toBe(true);
    expect(isQuotePresetKey("picket")).toBe(false);
  });
});
