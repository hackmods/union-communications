import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORG_CHART_FORMAT,
  DEFAULT_ORG_CHART_LAYOUT,
  ORG_CHART_FORMATS,
  ORG_CHART_FORMAT_ORDER,
  isPortraitOrgChartFormat,
} from "./org-chart-formats";

describe("org-chart-formats", () => {
  it("includes letter/tabloid portrait and landscape", () => {
    expect(ORG_CHART_FORMAT_ORDER).toEqual([
      "letter",
      "letter-landscape",
      "tabloid",
      "tabloid-landscape",
    ]);
    expect(ORG_CHART_FORMATS["letter-landscape"].widthInches).toBeGreaterThan(
      ORG_CHART_FORMATS["letter-landscape"].heightInches,
    );
    expect(isPortraitOrgChartFormat("letter")).toBe(true);
    expect(isPortraitOrgChartFormat("letter-landscape")).toBe(false);
    expect(DEFAULT_ORG_CHART_FORMAT).toBe("letter");
    expect(DEFAULT_ORG_CHART_LAYOUT).toBe("poster");
  });
});
