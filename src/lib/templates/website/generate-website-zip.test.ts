import { describe, it, expect } from "vitest";
import {
  buildWebsiteHtml,
  buildWebsiteCss,
  buildPreviewHtml,
  getOpseuHeaderSvg,
} from "@/lib/templates/website/generate-website-zip";
import type { WebsiteTemplateData } from "@/types/website-template";

const sampleData: WebsiteTemplateData = {
  localNumber: "243",
  unionName: "OPSEU SEFPO Local 243",
  heroText: "Support staff united.",
  about1: "About paragraph one.",
  about2: "About paragraph two.",
  contactEmail: "local243@example.com",
  facebookUrl: "https://facebook.com/groups/example",
  officeAddress: "Room S206",
  primaryColor: "#003DA5",
  secondaryColor: "#FFD200",
  officers: [
    { name: "Jane Doe", role: "President", location: "WC-101" },
  ],
};

describe("generate-website-zip", () => {
  it("includes OPSEU header SVG reference in HTML", () => {
    const html = buildWebsiteHtml(sampleData);
    expect(html).toContain("opseu-header.svg");
    expect(html).toContain("OPSEU SEFPO Local 243");
    expect(html).toContain("Jane Doe");
    expect(html).toContain("mailto:local243@example.com");
  });

  it("escapes HTML in user content", () => {
    const html = buildWebsiteHtml({
      ...sampleData,
      unionName: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("applies brand colours to CSS", () => {
    const css = buildWebsiteCss("#003DA5", "#FFD200");
    expect(css).toContain("--color-primary: #003DA5");
    expect(css).toContain("--color-secondary: #FFD200");
  });

  it("builds preview HTML with inline styles", () => {
    const preview = buildPreviewHtml(sampleData);
    expect(preview).toContain("<style>");
    expect(preview).not.toContain('href="./css/style.css"');
  });

  it("exports OPSEU header SVG", () => {
    const svg = getOpseuHeaderSvg();
    expect(svg).toContain("OPSEU / SEFPO");
    expect(svg).toContain("#003DA5");
  });
});
