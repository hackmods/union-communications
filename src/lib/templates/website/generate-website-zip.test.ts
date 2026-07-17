import { describe, it, expect } from "vitest";
import {
  buildWebsiteHtml,
  buildWebsiteCss,
  buildPreviewHtml,
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
  logoFileName: "logo.png",
  logoPreviewSrc: "/assets/caat-opseu/logo-primary.png",
  logoAlt: "OPSEU SEFPO Local 243",
  includeOpseuResources: true,
};

describe("generate-website-zip", () => {
  it("includes Brand Kit logo and OPSEU resources when theme is OPSEU", () => {
    const html = buildWebsiteHtml(sampleData);
    expect(html).toContain('src="./assets/logo.png"');
    expect(html).toContain('alt="OPSEU SEFPO Local 243"');
    expect(html).not.toContain("opseu-header.svg");
    expect(html).toContain("OPSEU SEFPO Local 243");
    expect(html).toContain("Jane Doe");
    expect(html).toContain("mailto:local243@example.com");
    expect(html).toContain("Rights &amp; Partners");
    expect(html).toContain("Ontario Human Rights Code");
    expect(html).toContain("Union Resources");
    expect(html).toContain('href="https://opseu.org"');
    expect(html).toContain("North Pole, Arctic Circle");
  });

  it("omits OPSEU resource links when theme is not OPSEU", () => {
    const html = buildWebsiteHtml({
      ...sampleData,
      unionName: "CUPE Local 123",
      logoAlt: "CUPE Local 123",
      includeOpseuResources: false,
    });
    expect(html).not.toContain("Union Resources");
    expect(html).not.toContain("opseu.org");
    expect(html).not.toContain("members.opseu.org");
    expect(html).toContain("Rights &amp; Partners");
    expect(html).toContain('src="./assets/logo.png"');
  });

  it("falls back to text brand when logo filename is empty", () => {
    const html = buildWebsiteHtml({
      ...sampleData,
      logoFileName: "",
      logoPreviewSrc: "",
    });
    expect(html).toContain('class="header-brand-text"');
    expect(html).not.toContain('class="header-logo"');
  });

  it("escapes HTML in user content", () => {
    const html = buildWebsiteHtml({
      ...sampleData,
      unionName: "<script>alert(1)</script>",
      logoAlt: "<script>alert(1)</script>",
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

  it("builds preview HTML with inline styles and logo preview src", () => {
    const preview = buildPreviewHtml(sampleData);
    expect(preview).toContain("<style>");
    expect(preview).not.toContain('href="./css/style.css"');
    expect(preview).toContain('src="/assets/caat-opseu/logo-primary.png"');
    expect(preview).not.toContain('src="./assets/logo.png"');
  });
});
