import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORG_CHART_FORMAT,
  DEFAULT_ORG_CHART_LAYOUT,
  ORG_CHART_FORMATS,
  ORG_CHART_FORMAT_ORDER,
  ORG_CHART_LAYOUT_ORDER,
  coerceOrgChartLayoutId,
  isOrgChartListLayout,
  isPortraitOrgChartFormat,
  orgChartLayoutShowsLocation,
} from "./org-chart-formats";

describe("org-chart-formats", () => {
  it("includes letter/tabloid portrait and landscape", () => {
    expect(ORG_CHART_FORMAT_ORDER).toEqual([
      "letter",
      "letter-landscape",
      "tabloid",
      "tabloid-landscape",
    ]);
    expect(ORG_CHART_FORMATS.letter.previewWidthPx).toBe(306);
    expect(ORG_CHART_FORMATS["tabloid-landscape"].previewWidthPx).toBe(612);
    expect(ORG_CHART_FORMATS["letter-landscape"].widthInches).toBeGreaterThan(
      ORG_CHART_FORMATS["letter-landscape"].heightInches,
    );
    expect(isPortraitOrgChartFormat("letter")).toBe(true);
    expect(isPortraitOrgChartFormat("letter-landscape")).toBe(false);
    expect(DEFAULT_ORG_CHART_FORMAT).toBe("letter");
    expect(DEFAULT_ORG_CHART_LAYOUT).toBe("poster");
  });

  it("offers poster, list, and list-location layouts", () => {
    expect(ORG_CHART_LAYOUT_ORDER).toEqual([
      "poster",
      "list",
      "list-location",
    ]);
    expect(isOrgChartListLayout("list")).toBe(true);
    expect(isOrgChartListLayout("list-location")).toBe(true);
    expect(isOrgChartListLayout("poster")).toBe(false);
    expect(orgChartLayoutShowsLocation("list-location")).toBe(true);
    expect(orgChartLayoutShowsLocation("list")).toBe(false);
    expect(coerceOrgChartLayoutId("directory")).toBe("list-location");
  });
});
