import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/seo/site";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import { canvasPreviewQrTarget } from "./canvas-preview-qr";

describe("canvasPreviewQrTarget", () => {
  it("uses the saved local website", () => {
    const kit = normalizeBrandKit({
      version: "2.0",
      local: { id: "x", localNumber: "243", subText: "Support" },
      primaryColor: "#003DA5",
      secondaryColor: "#FFFFFF",
      accentColor: "#002868",
      useOfficialLogo: false,
      websiteUrl: "https://local243.org",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(canvasPreviewQrTarget(kit)).toBe("https://local243.org");
  });

  it("falls back to the public UnionOps origin when no website is saved", () => {
    const kit = normalizeBrandKit({
      version: "2.0",
      local: { id: "x", localNumber: "", subText: "" },
      primaryColor: "#000000",
      secondaryColor: "#FFFFFF",
      accentColor: "#000000",
      useOfficialLogo: false,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(canvasPreviewQrTarget(kit)).toBe(SITE_URL);
  });
});
