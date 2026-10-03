import { describe, expect, it } from "vitest";
import {
  composeLetterheadContact,
  headerHalfPointsToMockPx,
  letterheadBandWidths,
  letterheadContentWidthTwips,
  letterheadLogoInches,
  letterheadLogoSlotPx,
  letterheadPptxBandHeightInches,
  LETTERHEAD_LOGO_MAX_H_PX,
  LETTERHEAD_MARGIN_TWIPS,
  LETTERHEAD_PAGE_WIDTH_TWIPS,
} from "./office-letterhead-layout";

describe("office-letterhead-layout", () => {
  it("sizes the band to the full content width", () => {
    const widths = letterheadBandWidths();
    expect(widths.contentTwips).toBe(
      letterheadContentWidthTwips(
        LETTERHEAD_PAGE_WIDTH_TWIPS,
        LETTERHEAD_MARGIN_TWIPS,
      ),
    );
    expect(widths.logoColTwips + widths.textColTwips).toBe(widths.contentTwips);
    expect(widths.contentTwips).toBeGreaterThan(10000);
    expect(widths.logoColTwips).toBeGreaterThan(2000);
  });

  it("composes contact from name, then office fields", () => {
    expect(
      composeLetterheadContact({ contactName: "Chief steward" }),
    ).toBe("Chief steward");
    expect(
      composeLetterheadContact({
        officeEmail: "local@example.org",
        officePhone: "555-0100",
        officeAddress: "1 Union Hall",
      }),
    ).toBe("local@example.org · 555-0100 · 1 Union Hall");
    expect(composeLetterheadContact({})).toBe("");
  });

  it("preserves logo aspect inside the letterhead slot", () => {
    const [w, h] = letterheadLogoSlotPx({ widthPx: 400, heightPx: 160 });
    expect(h).toBe(LETTERHEAD_LOGO_MAX_H_PX);
    expect(w / h).toBeCloseTo(400 / 160, 5);
    expect(h).toBeGreaterThan(56);
    const inches = letterheadLogoInches({ widthPx: 400, heightPx: 160 });
    expect(inches.w / inches.h).toBeCloseTo(400 / 160, 5);
  });

  it("keeps a tall enough PowerPoint band for the logo", () => {
    const h = letterheadPptxBandHeightInches({ widthPx: 400, heightPx: 160 });
    expect(h).toBeGreaterThan(letterheadLogoInches({ widthPx: 400, heightPx: 160 }).h);
    expect(letterheadPptxBandHeightInches(null)).toBeGreaterThan(1);
  });

  it("maps Word half-points to mock px", () => {
    expect(headerHalfPointsToMockPx(28)).toBeGreaterThan(headerHalfPointsToMockPx(24));
    expect(headerHalfPointsToMockPx(36)).toBeGreaterThan(18);
  });
});
