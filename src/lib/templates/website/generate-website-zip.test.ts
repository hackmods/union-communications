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
  officeAddress: "North Pole, Arctic Circle\n1 Santa Claus Lane\nH0H 0H0, Canada",
  primaryColor: "#003DA5",
  secondaryColor: "#FFFFFF",
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
    expect(html).toContain("Rights &amp; Partners");
    expect(html).toContain("Ontario Human Rights Code");
    expect(html).toContain("Union Resources");
    expect(html).toContain('href="https://opseu.org"');
    expect(html).toContain("North Pole, Arctic Circle");
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
    const css = buildWebsiteCss("#003DA5", "#FFFFFF");
    expect(css).toContain("--color-primary: #003DA5");
    expect(css).toContain("--color-secondary: #FFFFFF");
    expect(css).toContain(".site-header {\n  background: var(--color-primary);");
    expect(css).toContain(".footer {\n  background: var(--color-primary);");
  });

  it("builds preview HTML with inline styles", () => {
    const preview = buildPreviewHtml(sampleData);
    expect(preview).toContain("<style>");
    expect(preview).not.toContain('href="./css/style.css"');
  });

  it("exports OPSEU header SVG with brand colour", () => {
    const svg = getOpseuHeaderSvg("#C8102E");
    expect(svg).toContain("OPSEU / SEFPO");
    expect(svg).toContain('fill="#C8102E"');
  });
});
