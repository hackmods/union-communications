import { describe, expect, it } from "vitest";
import {
  normalizeCatalogSearchText,
  parsePublicCatalogQuery,
  updatePublicCatalogQuery,
} from "./public-catalog-query";

describe("public catalog query state", () => {
  it("parses supported filters and ignores unknown values", () => {
    expect(parsePublicCatalogQuery(new URLSearchParams(
      "q=réunion&audience=steward&topic=safety&format=invalid&privacy=officer-hub",
    ))).toEqual({
      q: "réunion",
      audience: "steward",
      topic: "safety",
      format: "",
      privacy: "officer-hub",
    });
  });

  it("updates catalog parameters without dropping unrelated context", () => {
    const next = updatePublicCatalogQuery(
      new URLSearchParams("campaign=fall&q=poster&topic=print"),
      { q: "notice", audience: "comms", topic: "", format: "", privacy: "on-device" },
    );
    expect(next.get("campaign")).toBe("fall");
    expect(next.get("q")).toBe("notice");
    expect(next.get("audience")).toBe("comms");
    expect(next.has("topic")).toBe(false);
    expect(next.get("privacy")).toBe("on-device");
  });

  it("matches French queries with or without accents", () => {
    expect(normalizeCatalogSearchText("Réunion générale")).toBe("reunion generale");
    expect(normalizeCatalogSearchText("reunion generale"))
      .toBe(normalizeCatalogSearchText("Réunion générale"));
  });
});
