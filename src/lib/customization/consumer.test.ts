import { describe, expect, it } from "vitest";
import { brandBaselineToPatch } from "@/lib/customization/brand-baseline";
import { loadCustomizationContent } from "@/lib/customization/deliver-server";

describe("customization C08 consumers", () => {
  it("maps a brand baseline DTO into an explicit Brand Kit patch", () => {
    const patch = brandBaselineToPatch({
      key: "brand:baseline",
      locale: "en",
      payload: {
        kind: "brand",
        primaryColor: "#112233",
        secondaryColor: "#445566",
        accentColor: "#778899",
        headlineFontId: "montserrat",
        bodyFontId: "sourceSans",
      },
    });
    expect(patch).toMatchObject({
      primaryColor: "#112233",
      canvas: { headlineFontId: "montserrat", bodyFontId: "sourceSans" },
    });
  });

  it("falls back to compiled defaults when PostgreSQL is unavailable", async () => {
    const result = await loadCustomizationContent({
      key: "guide:learn-print",
      locale: "en",
    });
    expect(result.status).toBe("missing");
  });
});
